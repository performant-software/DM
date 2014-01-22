from haystack import indexes
from semantic_store.models import Text

class TextIndex(indexes.SearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
    title = indexes.CharField(model_attr='title')
    timestamp = indexes.CharField(model_attr='timestamp')
    project = indexes.CharField(model_attr='project')
    identifier = indexes.CharField(model_attr='identifier')
    content_auto = indexes.EdgeNgramField(use_template=True, template_name='search/indexes/semantic_store/text_text.txt')

    def get_model(self):
        return Text

    def index_queryset(self, using=None):
        return self.get_model().objects.filter(valid=True).exclude(project__isnull=True)
