from django.db import migrations, models
import apps.professionals.validators


class Migration(migrations.Migration):
    dependencies = [("professionals", "0002_alter_professional_options_alter_specialty_options")]
    operations = [
        migrations.AlterField(
            model_name="professional",
            name="slug",
            field=models.SlugField(
                max_length=140, unique=True,
                validators=[apps.professionals.validators.validate_public_slug],
            ),
        ),
    ]
