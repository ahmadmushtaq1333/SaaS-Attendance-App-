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
            course = Course.objects.get(id=pk, teacher=request.user)
        except Course.DoesNotExist:
            return Response({"error": "Course not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Calculate total sessions for this course
        total_sessions = AttendanceSession.objects.filter(course=course).count()
        
        # Get all enrolled students
        enrollments = Enrollment.objects.filter(course=course).select_related("student")
        
        students_report = []
        defaulters_list = []
        
        for enrollment in enrollments:
            student = enrollment.student
            # Count sessions attended by this student for this course
            attended_count = AttendanceRecord.objects.filter(
                student=student,
                session__course=course
            ).count()
            
            attendance_percentage = 0.0
            if total_sessions > 0:
                attendance_percentage = (attended_count / total_sessions) * 100.0
            
            student_data = {
                "id": student.id,
                "email": student.email,
                "attended_count": attended_count,
                "attendance_percentage": round(attendance_percentage, 2)
            }
            
            students_report.append(student_data)
            
            # Defaulter threshold: < 75%
            if attendance_percentage < 75.0:
                defaulters_list.append(student_data)
                
        return Response({
            "course_name": course.name,
            "total_sessions": total_sessions,
            "students": students_report,
            "defaulters_list": defaulters_list
        })
