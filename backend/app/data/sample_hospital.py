"""
Seed data for a small demo hospital: 4 departments wired together with
realistic dependencies so the ripple effect has something to travel through.

  Emergency  --depends on-->  General Ward   (needs open beds to admit into)
  Emergency  --depends on-->  Radiology      (needs diagnostic throughput)
  ICU        --depends on-->  General Ward   (step-down transfers)
"""

from app.models import Department, DepartmentId, HospitalState


def get_initial_state() -> HospitalState:
    departments = {
        DepartmentId.EMERGENCY: Department(
            id=DepartmentId.EMERGENCY,
            name="Emergency Department",
            beds_total=20,
            beds_occupied=17,
            staff_total=10,
            staff_assigned=10,
            patients_waiting=14,
            avg_service_time_min=35,
            depends_on=[DepartmentId.GENERAL_WARD, DepartmentId.RADIOLOGY],
        ),
        DepartmentId.ICU: Department(
            id=DepartmentId.ICU,
            name="Intensive Care Unit",
            beds_total=12,
            beds_occupied=10,
            staff_total=8,
            staff_assigned=8,
            patients_waiting=1,
            avg_service_time_min=90,
            depends_on=[DepartmentId.GENERAL_WARD],
        ),
        DepartmentId.GENERAL_WARD: Department(
            id=DepartmentId.GENERAL_WARD,
            name="General Ward",
            beds_total=40,
            beds_occupied=36,
            staff_total=14,
            staff_assigned=14,
            patients_waiting=3,
            avg_service_time_min=25,
            depends_on=[],
        ),
        DepartmentId.RADIOLOGY: Department(
            id=DepartmentId.RADIOLOGY,
            name="Radiology / Diagnostics",
            beds_total=0,
            beds_occupied=0,
            staff_total=6,
            staff_assigned=6,
            patients_waiting=9,
            avg_service_time_min=20,
            depends_on=[],
        ),
    }
    return HospitalState(departments=departments)
