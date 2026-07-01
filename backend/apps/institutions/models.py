from django.db import models

class Institution(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Department(models.Model):
    name = models.CharField(max_length=255)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="departments")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.institution.name})"

class Semester(models.Model):
    number = models.CharField(max_length=50) # e.g. "Semester 1", "Fall 2026"
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="semesters")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.number} - {self.department.name}"

class Section(models.Model):
    name = models.CharField(max_length=50) # e.g. "Section A", "Section B"
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name="sections")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.semester.number})"

