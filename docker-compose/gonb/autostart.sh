#!/bin/bash

# Run JupyterLab from $NOTEBOOKS as user $NB_USER.
su -l "${NB_USER}" -c "cd \"${NOTEBOOKS}\" ; jupyter lab --NotebookApp.token='' --NotebookApp.password=''"
