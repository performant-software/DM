from django.db import models

class Permission(models.Model):
    read = 1
    read_write = 2
    
    choices = (
        (read, "read"),
        (read_write, "read_write"),
        )
    choices_display = tuple([i[1] for i in choices])

    @classmethod
    def choice_display(cls, choice):
        for i in choices:
            if i[0] == choice:
                return i[1]
        raise Exception("Unknown choice:" + choice)

choices = Permission.choices
choices_display = Permission.choices

