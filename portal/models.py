# portal/models.py

from django.db import models


class Car(models.Model):
    name = models.CharField(max_length=200, verbose_name="Название машины")
    notes = models.TextField(blank=True, null=True, verbose_name="Заметки")

    # Поля для технического обслуживания
    oil_change_interval = models.IntegerField(
        default=50000,
        verbose_name="Интервал замены масла (км)"
    )
    tire_change_interval = models.IntegerField(
        default=60000,
        verbose_name="Интервал замены резины (км)"
    )
    last_oil_change_km = models.IntegerField(
        default=0,
        verbose_name="Последняя замена масла на пробеге (км)"
    )
    last_tire_change_km = models.IntegerField(
        default=0,
        verbose_name="Последняя замена резины на пробеге (км)"
    )

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Машина"
        verbose_name_plural = "Машины"


class Trip(models.Model):
    car = models.ForeignKey(
        Car,
        on_delete=models.CASCADE,
        related_name='trips',
        verbose_name="Машина"
    )
    km = models.IntegerField(verbose_name="Километры")
    date = models.DateField(verbose_name="Дата")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.car.name} - {self.km} км ({self.date})"

    class Meta:
        verbose_name = "Поездка"
        verbose_name_plural = "Поездки"
        ordering = ['-date']