DM: Tools For Digital Annotation and Linking
==
(Formerly Digital Mappaemundi)

![DM User Interface](http://dm.drew.edu/dm_workspace/dm_github_images/DM_User_Interface.png)

[DM Project Wiki Pages](https://github.com/timandres/DM/wiki/_pages)

*The current iteration of DM is at an alpha testing stage.*

DM is an environment for the study and annotation of images and texts. It is a suite of tools, enabling scholars to gather and organize the evidence necessary to support arguments based in digitized resources. DM enables users to mark fragments of interest in manuscripts, print materials, photographs, etc. and provide commentary on these resources and the relationships among them. A principle objective in this project is to continue to develop our understanding of scholarly work processes in order to effectively support research as it is practiced now, while opening the door for new methods of scholarship to emerge. [More on the purpose of DM...](https://github.com/timandres/DM/wiki/The-Purpose-of-DM)

On a technical level, DM consists of two major pieces – a HTML5 front end (found in `workspace/static/`), and a Django based back end which synchronizes and stores the data. While the back end relies upon python rdflib tools to deal with RDF data, the front end uses a custom built RDF data store, synchronization, and querying system maintained in the `sc.data` javascript package in the `workspace/static/js/sc/data/` directory. The data model is based around the [Open Annotation](http://www.openannotation.org/) and [Shared Canvas](http://www.shared-canvas.org/) data models.


The design of the DM software is detailed in Lead Developer Tim Andres's [undergraduate thesis](http://walter.drew.edu/ETD/BA/2014/Andres/TAndres.pdf). You can also take a look at the [Interacting with RDF Data](https://github.com/timandres/DM/wiki/Interacting-with-RDF-Data) wiki page for an explanation of the core data apis of the system.


Install Steps
==
1. SSH to the DM server and navigate to the home directory for the user that runs DM
2. Stop all gunicorn processes
3. Copy DM/local_settings.py to a backup location outside of DM
4. Rename the DM directory to DM_todays_date
5. Clone the project: git clone https://github.com/performant-software/DM.git
6. Create virtual environment for Python: virtualenv DM
7. Move to the DM directory and activate it: source bin/activate
8. Enter: pip install -r requirements.txt 
9. Copy the backed up settings file to the new DM directory
10. Enter: python manage.py collectstatic
11. Setup media directory: ln -s /var/lib/dm/media/ media
12. (Do only if chenges were made to the DM schema. Unlikely.) Enter:  python manage.py migrate semantic_store
13. Restart: gunicorn -c gunicorn.ini wsgi:application &  


4store Notes
==
* To create a new 4store datastore for DM (WARNING: This will destroy any prior data): sudo 4s-backend-setup dm
* Starting the server requires 2 commands: **sudo 4s-backend dm** and **sudo 4s-httpd -p 8888 -D dm &**
* The data for 4store is located here: /var/lib/4store/


Backup Notes
==
On legacy projects, the front end download link does not work. Project must be exported using a back-end Python task. Here are the steps:


Collect necessary data:

1. Log in to DM with a user with admin access to the target project using Chrome.
2. Open the developer tools (the can be found under the More Tools menu item)
3. Switch to the Network tab.
4. Open the target project and look in the network message area. Your should see something like: http://dm-server.library.upenn.edu/store/projects/urn:uuid:g6yb94kjyf68uwvmjlpaf61kyhtex6z4uo4
5. The sequence of data starting with urn:uuid is the project guid. Copy for use later.
6. Navigate to the resources tab, expand Cookies and select dm.server.library.upenn.edu
7. Copy the values for csrftoken and sessionid in this format (all one line): **csrftoken=[token]; sessionid=[id]**

Back up the project:

1. SSH in to the DM host and navigate to the DM directory.
2. Enter: source bin/activate
3. Enter: python tools/rdf_crawler.py http://localhost/store/projects/[project_guid] [output_name].ttl 
   : where project_guid is the guid collected in step 5 above
4. You will be prompted for Cookie. Paste the csrftoken / sessionid line from step 7 above.
5. The download process should start. Larger projects can take several hours to complete

Restore Notes
==
Projects can only be restored from a TTL file from the back end. Here are the steps:

1. SCP the target file to the DM host
2. SSH to the DM host
3. Navigate to the root DM directory
4. Enter: source bin/activate
5. Enter: python manage.py rdf_import -f [file]
6. The restore process will start, and can take several hours to complete.

