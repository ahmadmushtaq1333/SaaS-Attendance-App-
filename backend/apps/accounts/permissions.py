from rest_framework import permissions

class IsTeacher(permissions.BasePermission):
    """
    Allows access only to teachers.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == "teacher"
        )

class IsStudent(permissions.BasePermission):
    """
    Allows access only to students.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == "student"
        )

class IsAdminUser(permissions.BasePermission):
    """
    Allows access to any admin (Global Super Admin or Institution Admin)
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == "admin" or request.user.is_staff or request.user.is_superuser)
        )

class IsGlobalAdmin(permissions.BasePermission):
    """
    Allows access only to Global Super Admins (is_superuser=True or no institution attached).
    Used for creating/deleting institutions or cross-tenant operations.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or (request.user.role == "admin" and not request.user.institution))
        )
