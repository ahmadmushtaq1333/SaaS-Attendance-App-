def scope_for_admin(user, queryset, institution_field="institution", department_field="department"):
    """
    Narrows a queryset to the admin's institution/department scope.
    Superusers get the full queryset unchanged.
    """
    if user.is_superuser:
        return queryset
    if getattr(user, 'institution', None):
        queryset = queryset.filter(**{institution_field: user.institution})
    if getattr(user, 'department', None):
        queryset = queryset.filter(**{department_field: user.department})
    return queryset
