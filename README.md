DM: Tools For Digital Annotation and Linking
==
(Formerly Digital Mappaemundi)

![DM User Interface](http://dm.drew.edu/dm_workspace/dm_github_images/DM_User_Interface.png)

[DM Project Wiki Pages](https://github.com/timandres/DM/wiki/_pages)

*The current iteration of DM is at an alpha testing stage.*

DM is an environment for the study and annotation of images and texts. It is a suite of tools, enabling scholars to gather and organize the evidence necessary to support arguments based in digitized resources. DM enables users to mark fragments of interest in manuscripts, print materials, photographs, etc. and provide commentary on these resources and the relationships among them. A principle objective in this project is to continue to develop our understanding of scholarly work processes in order to effectively support research as it is practiced now, while opening the door for new methods of scholarship to emerge. [More on the purpose of DM...](https://github.com/timandres/DM/wiki/The-Purpose-of-DM)

On a technical level, DM consists of two major pieces – a HTML5 front end (found in `workspace/static/`), and a Django based back end which synchronizes and stores the data. While the back end relies upon python rdflib tools to deal with RDF data, the front end uses a custom built RDF data store, synchronization, and querying system maintained in the `sc.data` javascript package in the `workspace/static/js/sc/data/` directory.


The design of the DM software is detailed in Lead Developer Tim Andres's [undergraduate thesis](http://walter.drew.edu/ETD/BA/2014/Andres/TAndres.pdf). You can also take a look at the [Interacting with RDF Data](https://github.com/timandres/DM/wiki/Interacting-with-RDF-Data) wiki page for an explanation of the core data apis of the system.
