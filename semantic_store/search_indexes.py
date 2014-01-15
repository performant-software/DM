from haystack import indexes
from semantic_store.models import Text

class TextIndex(indexes.SearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, model_attr='content')
    title = indexes.CharField(model_attr='title')
    timestamp = indexes.CharField(model_attr='timestamp')

    def get_model(self):
        return Text

    def index_queryset(self, using=None):
        return self.get_model().objects.filter(valid=True)
