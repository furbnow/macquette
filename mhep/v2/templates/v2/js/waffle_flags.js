window.features = [
    {% for feature in features %}'{{ feature }}',{% endfor %}
]
