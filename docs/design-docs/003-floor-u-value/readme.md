You generate the docs by running `make html` in `/docs`. The make command will pick up everything under an `rst` extension.

---

With my current setup, suggesting that I use Typora to generate a markdown draft, because it works a lot nicer than ReText when editing stuff.

Once I'm happy with the draft, use Typora to convert to rst, the do the final touches in ReText (enable preview mode). You have to add in images again, cause Typora doesn't convert them properly.

^ Not great, should find a nice tool to do stuff in rst.

Don't forget, with images...

```reStructuredText
.. image:: picture.jpeg
   :height: 100px
   :width: 200 px
   :scale: 50 %
   :alt: alternate text
   :align: right
```

---

getting the docs live? https://gitlab.com/carboncoop/macquette/-/blob/master/.gitlab-ci.yml#L60

https://carboncoop.slack.com/archives/CGSPJLL7R/p1614091590019500?thread_ts=1614087417.016300&cid=CGSPJLL7R
