from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsTeacher
from apps.courses.models import Course, Enrollment
from apps.attendance.models import AttendanceSession, AttendanceRecord

class CourseReportView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, pk):
        try:
            course = Course.objects.get(id=pk, course_instructors__instructor=request.user)
        except Course.DoesNotExist:
            return Response({"error": "Course not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Calculate total sessions for this course
        sessions = AttendanceSession.objects.filter(course=course).order_by("start_time")
        total_sessions = sessions.count()
        session_list = [{"id": s.id, "start_time": s.start_time} for s in sessions]
        
        # Get all enrolled students
        enrollments = Enrollment.objects.filter(course=course).select_related("student")
        
        # Fetch all attendance records for this course at once for performance
        records = AttendanceRecord.objects.filter(
            session__course=course
        ).values_list('enrollment_id', 'session_id')
        
        # Create a set for O(1) lookup
        attendance_set = set(records)
        
        students_report = []
        defaulters_list = []
        
        for enrollment in enrollments:
            student = enrollment.student
            
            # Map out which specific sessions this student attended
            student_sessions = {}
            attended_count = 0
            for session in sessions:
                is_present = (enrollment.id, session.id) in attendance_set
                student_sessions[session.id] = is_present
                if is_present:
                    attended_count += 1
            
            attendance_percentage = 0.0
            if total_sessions > 0:
                attendance_percentage = (attended_count / total_sessions) * 100.0
            
            student_data = {
                "id": student.id,
                "email": student.email,
                "attended_count": attended_count,
                "attendance_percentage": round(attendance_percentage, 2),
                "sessions": student_sessions
            }
            
            students_report.append(student_data)
            
            # Defaulter threshold: < 75%
            if attendance_percentage < 75.0:
                defaulters_list.append(student_data)
                
        return Response({
            "course_name": course.name,
            "total_sessions": total_sessions,
            "session_list": session_list,
            "students": students_report,
            "defaulters_list": defaulters_list
        })
