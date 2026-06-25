from rest_framework import permissions

class IsTeacher(permissions.BasePermission):
    """
    Allows access only to teachers.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == "teacher"

class IsStudent(permissions.BasePermission):
    """
    Allows access only to students.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == "student"

class IsAdminUser(permissions.BasePermission):
    """
    Allows access to admins (staff or explicit role)
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (request.user.role == "admin" or request.user.is_staff)
