from django.forms import Form, ImageField, BooleanField, ModelChoiceField, RadioSelect
from semantic_store.models import UploadedImage
# Used for uploading images
# Has built-in functionality to check that file selected is an image file
class ImageForm(Form):
    imagefile=ImageField(label="Select image to upload.")
    public=BooleanField(label="Public Image", required=False)

class PublicImageForm(ImageForm):
    public=BooleanField(label="Public Image", required=True)

class AddPublicImageForm(Form):
	image_choices=ModelChoiceField(queryset=UploadedImage.objects.filter(isPublic=True), label="From Public Images: ", widget=RadioSelect())

class AddPrivateImageForm(Form):
	image_choices=ModelChoiceField(queryset=UploadedImage.objects.none(), label="From My Images")

	# Allow the queryset to be dynamically generated when a username is supplied to form
	def __init__(self, *args, **kwargs):
		user=kwargs.pop('user')

		super(AddPrivateImageForm, self).__init__(*args, **kwargs)
		self.fields['image_choices'].queryset = UploadedImage.objects.filter(owner=user)