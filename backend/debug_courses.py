from apps.courses.models import Course
from apps.accounts.serializers_admin import CourseAdminSerializer
from django.db.models import Count

try:
    qs = Course.objects.all().annotate(enrollment_count=Count('enrollments', distinct=True))
    print(f'Courses found: {qs.count()}')
    for c in qs:
        print(f'  Course: {c.name}, dept={c.department}, section={c.section}')
    s = CourseAdminSerializer(qs, many=True)
    print('Serialized OK:', s.data)
except Exception as e:
    import traceback
    traceback.print_exc()
    print('ERROR:', e)
