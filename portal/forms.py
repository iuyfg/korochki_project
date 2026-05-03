# from django import forms
# from .models import Student, Application
# from django.utils import timezone
# from .models import Review
#
# class StudentForm(forms.ModelForm):
#     class Meta:
#         model = Student
#         fields = ['full_name', 'email', 'phone']
#
#
# class ApplicationForm(forms.Form):
#     full_name = forms.CharField(max_length=150, label='ФИО')
#     email = forms.EmailField(label='Email')
#     phone = forms.CharField(max_length=20, label='Телефон')
#
#     def save(self, course):
#         # создаём студента
#         student = Student.objects.create(
#             full_name=self.cleaned_data['full_name'],
#             email=self.cleaned_data['email'],
#             phone=self.cleaned_data['phone']
#         )
#         # создаём заявку
#         application = Application.objects.create(
#             student=student,
#             course=course,
#             start_date=timezone.now().date()
#         )
#         return application
#
#
# class ReviewForm(forms.ModelForm):
#     class Meta:
#         model = Review
#         fields = ['text']
#         widgets = {
#             'text': forms.Textarea(attrs={'rows': 4})
#         }