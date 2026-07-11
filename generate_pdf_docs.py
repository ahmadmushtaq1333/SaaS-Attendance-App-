import os
import subprocess
import sys

# Ensure fpdf2 is installed
try:
    from fpdf import FPDF
except ImportError:
    print("Installing fpdf2 library dynamically...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fpdf2"])
    from fpdf import FPDF

class AttendanceAppDocPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(100, 116, 139)
            self.cell(0, 10, "SaaS Attendance Management System - Documentation", 0, 0, "L")
            self.set_draw_color(226, 232, 240)
            self.line(10, 20, 200, 20)
            self.ln(12)

    def footer(self):
        if self.page_no() > 1:
            self.set_y(-15)
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(100, 116, 139)
            self.set_draw_color(226, 232, 240)
            self.line(10, 282, 200, 282)
            self.cell(0, 10, f"Page {self.page_no()}", 0, 0, "C")

    def chapter_title(self, num, title):
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(30, 41, 59) # Slate 800
        self.cell(0, 12, f"Chapter {num}: {title}", 0, 1, "L")
        self.ln(4)

    def section_title(self, title):
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(79, 70, 229) # Indigo 600
        self.cell(0, 8, title, 0, 1, "L")
        self.ln(2)

    def paragraph(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(51, 65, 85) # Slate 700
        self.multi_cell(0, 6, text)
        self.ln(4)

def build_pdf():
    pdf = AttendanceAppDocPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # ------------------ COVER PAGE ------------------
    pdf.add_page()
    
    # Elegant top block
    pdf.set_fill_color(30, 41, 59)
    pdf.rect(0, 0, 210, 100, "F")
    
    pdf.set_y(40)
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 12, "SaaS Attendance Management", 0, 1, "C")
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, "Software System Documentation", 0, 1, "C")
    
    # Accent line
    pdf.set_fill_color(99, 102, 241)
    pdf.rect(40, 110, 130, 3, "F")
    
    # Details section
    pdf.set_y(150)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(79, 70, 229)
    pdf.cell(0, 8, "SYSTEM DIAGRAMS & DATABASE SCHEMAS", 0, 1, "C")
    
    pdf.set_y(220)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 6, "Target Environment: Docker Containerization", 0, 1, "C")
    pdf.cell(0, 6, "Architecture: Django REST + React SPA", 0, 1, "C")
    pdf.cell(0, 6, "Date: July 2026", 0, 1, "C")
    
    # ------------------ MAIN PAGES ------------------
    pdf.add_page()
    pdf.set_y(25)
    
    # Chapter 1
    pdf.chapter_title(1, "Introduction & Project Scope")
    pdf.paragraph(
        "This software application is a secure, multi-tenant Software-as-a-Service (SaaS) Attendance "
        "Management Web Application. It enables educational institutions to automate and track "
        "student attendance using dynamic QR code verification. The application is built using a "
        "distributed containerized architecture consisting of a Python/Django backend, a React SPA "
        "frontend, and a MySQL database backend."
    )
    pdf.section_title("Key System Objectives")
    pdf.paragraph(
        "- Prevent Spoofing: QR codes rotate dynamically every 20 seconds, preventing students from "
        "marking attendance remotely or sharing screenshots.\n"
        "- Tenant Scoping: Universities are segmented at the database level. Each administrator, teacher, "
        "and student can only access resources matching their authorized tenant.\n"
        "- Complete Audit Controls: Administrators possess full CRUD capabilities over users, "
        "universities, courses, and active classes."
    )
    
    pdf.ln(5)
    
    # Chapter 2
    pdf.chapter_title(2, "System Architecture & Component Diagram")
    pdf.paragraph(
        "The system runs inside an isolated Docker Compose network containing three distinct components:\n"
        "1. Web Client (SPA Browser): React single-page app containing user panels for scanning, directories, and dashboard metrics.\n"
        "2. Nginx Reverse Proxy: Exposes port 80 to clients, routes static assets, and forwards API queries to the Django REST framework.\n"
        "3. Django REST API: The Gunicorn server running Gunicorn/WSGI, resolving logins, sessions, and database mutations.\n"
        "4. MySQL Database: Persists universities, user permissions, courses, departments, semesters, and sections."
    )
    
    pdf.add_page()
    pdf.set_y(25)
    
    # Chapter 3
    pdf.chapter_title(3, "Database ERD (Entity-Relationship Diagram)")
    pdf.paragraph(
        "To accommodate academic routing, the database implements a strict four-layer tenant "
        "hierarchy: University (Institution) -> Department -> Semester -> Section."
    )
    pdf.section_title("Core Entities & Schema Relations")
    pdf.paragraph(
        "- Institution (University): Segmented tenant. All courses and user roles belong here.\n"
        "- Department: Multiple departments (e.g. Computer Science, Software Engineering) exist under each University.\n"
        "- Semester: Each department contains semesters (e.g. Semester 1 to Semester 8).\n"
        "- Section: Semesters contain sections (e.g. Section A to Section Z).\n"
        "- CustomUser: Has fields for email, password hash, role (admin/teacher/student), and foreign keys mapping them to their University, Department, Semester, and Section.\n"
        "- Course: Connects to a teacher profile and the linked University.\n"
        "- Enrollment: Links student user IDs to course IDs to tracks registration.\n"
        "- AttendanceSession: Lives for a course and handles generating live QR tokens.\n"
        "- AttendanceRecord: Stores student marking status ('present' or 'absent') and timestamps for a session."
    )
    
    # Save PDF
    pdf.output("SaaS_Attendance_App_Documentation.pdf")
    print("Documentation PDF created successfully!")

if __name__ == "__main__":
    build_pdf()
