#! /usr/bin/env python
# -*- coding: utf-8 -*-

#python common packages
import os
import re
import sys
import json
import string

#packages installed on DreamHost
from flask import Flask
from flask import request
from flask import render_template
from flask import jsonify
from flask import url_for
from flask import redirect

# Email libraries
import smtplib
from email.mime.text import MIMEText


setupfile = './static/setup.txt'
sf = (open(setupfile, 'r')).read()
line = sf.splitlines()
shortname = line[0].replace("shortname = ","")
longname = line[1].replace("longname = ","")
email = line[2].replace("email = ","")
version = line[3].replace("version = ","")
savefile = line[4].replace("savefile = ","")
meta = line[5].replace("meta = ","")
url = line[6].replace("url = ","")
logo = line[7].replace("logo = ","")
host = line[8].replace("host = ","")
port = line[9].replace("port = ","")
username = line[10].replace("username = ","")
password = line[11].replace("password = ","")


vocab = './static/UAT_list.json'
data = json.load(open(vocab))
alpha = sorted(data, key=lambda k: k['name']) 

hierarchy = './static/UAT.json'
datah = json.load(open(hierarchy))

def buildlist2(termlist,previous):
    current = termlist["uri"][30:]
    htree = ""
    
    if "children" in termlist:
        
        if previous == None:
            path = current
        else:
            path = previous+"-"+current

        htree += "\n\t\t<ul id=ul-"+path+" class='treeview'>\n"

        for xt in termlist["children"]:
            htree += "\t<li><a id=li-"+path+"-"+xt["uri"][30:]+" href="+xt["uri"][30:]+"?view=hierarchy&path="+path+">"+xt["name"]+"</a>"
            htree += buildlist2(xt,path)
            htree += "</li>\n"

        htree += "</ul>\n"

    return htree

htree = "<ul id='treemenu1' class='treeview'>"

for xt in datah["children"]:
    htree += "\n\t<li><a id=li-"+xt["uri"][30:]+" href="+xt["uri"][30:]+"?view=hierarchy>"+xt["name"]+"</a>"
    htree += buildlist2(xt,None)
    htree += "</li>"

htree += "\n</ul>"



app = Flask(__name__, static_folder='static', static_url_path='')

# static landing page, points to app features
@app.route('/')
def indexpg():
    return render_template("index.html")

# supports search and browse
@app.route('/uat/', defaults={'uatid': None})
@app.route('/uat/<int:uatid>')
def alphapg(uatid):

    # variable defaults
    results = []
    lookup = None
    unknown  = "no"
    path = None
    allpaths = []

    gtype = request.args.get('view')

    # user is trying to search the UAT
    if gtype == "search":
        element = "noelement"

        lookup = request.args.get('lookup')
        lookuplist = [lookup.lower(),lookup.title(),lookup.capitalize(),lookup.upper()]

        for x in alpha:

            termdict = {}

            try:
                if x["status"] != "deprecated":
                    pass
            except KeyError:

                # is the search query in the element ids?
                if lookup in str(x["uri"][30:]):
                    termdict["uri"] = str(x["uri"][30:]).replace(lookup,"<mark>"+lookup+"</mark>")
                    termdict["name"] = x["name"]
                    results.append(termdict)

                # is the search query in the concept?
                elif lookup in (x["name"]).lower():
                    termdict["uri"] = x["uri"][30:] 

                    for lu in lookuplist:
                        if lu in x["name"]:
                            termdict["name"] = (x["name"]).replace(lu,"<mark>"+lu+"</mark>")
                    results.append(termdict)

                # is the search query in the alt terms?
                else:
                    termdict["name"] = x["name"]
                    termdict["uri"] = x["uri"][30:]
                    if x["altNames"]:      
                        for z in x["altNames"]:
                            for lu in lookuplist:
                                if lu in z:
                                    termdict["altNames"] = z.replace(lu,"<mark>"+lu+"</mark>")
                                    results.append(termdict)
                                    break

   # user wants to browse the uat
    else: 
        # user wants to see the hierarchy
        if gtype == "hierarchy":
            try:
                path = request.args.get('path')

                splitpath = path.split('-')

                for x in splitpath:
                    if allpaths == []:
                        allpaths.append(x)
                    else:
                        allpaths.append(allpaths[-1]+"-"+x)
            except:
                pass
            
            if uatid != None:
                for x in alpha:
                    if int(x["uri"][30:]) == int(uatid):
                        element = x
            else:
                element = "noelement"

        # user wants to see an alphabetical list
        else:
            gtype = "alpha"

        if uatid != None:
            element = "noelement"
            unknown = "yes"
            for x in alpha:
                if int(x["uri"][30:]) == int(uatid):
                    element = x
                    unknown = "no"
                    
        else:
            element = "noelement"

    alphabet = list(string.ascii_lowercase)
    alphabet.append("#")

    return render_template("alpha.html", unknown=unknown, lookup=lookup, path=allpaths, results=results, htree=htree, alpha=alpha, gtype=gtype, element=element, alphabet=alphabet)

# sorting tool
@app.route('/sort/')
def sortingtool():
    names = os.listdir(os.path.join(app.static_folder, 'topconcepts'))
    filelist = []
    for y in names:
        filedict = {}
        filedict["name"] = y.capitalize().replace("_"," ").replace(".json","")
        filedict["file"] = y
        filedict["value"] = y.replace(".","").replace("json","")

        filelist.append(filedict)

    return render_template('sorting.html', filelist=filelist, shortname=shortname, longname=longname,logo=logo, version=version, savefile=savefile, meta=meta, url=url)


# email host, port, username, password, etc found in the static/setup.txt file
@app.route('/email',methods=['POST'])
def emailchanges():
    val = request.form['testarg']
    msg = MIMEText(val)

    me = username
    you = email
    msg['Subject'] = 'Suggestions from Sorting Tool'
    msg['From'] = me
    msg['To'] = you

    #Test Info
    #s = smtplib.SMTP('127.0.0.1:1025')
    
    #Live Info
    s = smtplib.SMTP()
    s.connect(host,port)
    s.login(username,password)
    
    #Test & Live
    s.sendmail(me, [you], msg.as_string())
    s.quit()

if __name__ == '__main__':
    app.run()

