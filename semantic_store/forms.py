from django.forms import Form, ImageField, BooleanField
# Used for uploading images
# Has built-in functionality to check that file selected is an image file
class ImageForm(Form):
    imagefile=ImageField(label="Select image to upload.")
    public=BooleanField(label="Public image", required=False)

class PublicImageForm(ImageForm):
    public=BooleanField(label="Public image", required=True)