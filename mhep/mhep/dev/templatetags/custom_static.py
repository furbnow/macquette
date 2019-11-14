from django.templatetags.static import StaticNode

from django import template

register = template.Library()


@register.tag()
def custom_static(parser, token):
    return StaticNode.handle_token(parser, token)
