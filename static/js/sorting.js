(function($) {

    $(document).ready(function() {

        //load up previously saved work
        var sortsaves = JSON.parse(localStorage.getItem(savefile));

        //start with empty list of save files
        savelist = [];

        //if there is nothing saved from before, create empty list to use later
        if (sortsaves == null || sortsaves == []){
            sortsaves = [];
        }
        //if there IS previous work, get the save file names and fills in the dropdown menu
        //also fills the savelist array with file names to check against later
        else {

            if ($("#nosave").length > 0) {
                $("#nosave").remove();

                var newoption = $("<option></option>")
                    .val("blank")
                    .text(" ");
            }          

            $("#saveopts").append(newoption);

            for (var k = 0; k < sortsaves.length; k++){
                load_name = sortsaves[k]["saveName"]
                savelist.push(load_name);
                var newoption = $("<option></option>")
                    .val(load_name)
                    .attr("id","save-"+load_name)
                    .text(load_name);

                $("#saveopts").append(newoption);
            }
        }
        
        $("#closeleft").on("click",function(){
            $("#leftside").toggle();
            $("#openleft").toggle();
            $("#feedback").hide();
            $("#showbutton").show();
            $("#hidebutton").hide();
            $("#title").show();
        });

        $("#openleft").on("click",function(){
            $("#leftside").toggle();
            $("#openleft").toggle();
            $("#title").hide();

        });


        $("#closeright").on("click",function(){
            $("#history").toggle();
            $("#openright").toggle();
        });

        $("#openright").on("click",function(){
            $("#history").toggle();
            $("#openright").toggle();

        });


        $("#savebutton").on("click", function(){

            try {
                var root = getRoot();

                var saveName = prompt("Name for save file?");
                var isvalid = /^\w+( \w+)*$/.test(saveName);
                if (saveName == null){
                    alert("Data Not Saved");
                }
                //if the user clicks "OK" and the save name is valid...
                else if (isvalid == true){
                    if ($.inArray(saveName, savelist) != -1){
                        alert("Please chose a unique name for your save file!");
                    }
                    else {

                        $('#opts').val("blank");

                        savestuff(saveName,sortsaves);

                        savelist.push(saveName);

                        if ($("#nosave").length > 0) {
                            $("#nosave").remove();
                            $("#blank").remove();

                            var newoption = $("<option></option>")
                                .val("blank").attr("id","blank")
                                .text(" ").attr("disabled","disabled");
                            $("#saveopts").append(newoption);
                        }

                        var newoption = $("<option></option>")
                            .val(saveName)
                            .text(saveName)
                            .attr("selected","selected")
                            .attr("id","save-"+saveName);

                        $("#saveopts").append(newoption);


                    }
                } //if the user clicks "OK" but the save name is invalid...
                else{
                    alert("The save name can only include letters, numbers, spaces, and underscores.");
                }



            } catch {
                alert("You have nothing to save.");

            }
            
        });

        $("#overridebutton").on("click", function(){

            var saveName = $("#saveopts").val();

            if (saveName == null || saveName == "blank") {
                alert("You have nothing to save, try 'Save As...'.");

            } else {
                var check = confirm("Are you sure you want save over '"+saveName+"'?");

                if (check == true){

                    var saveName = $("#saveopts").val();

                    for (var i = 0; i < sortsaves.length; i++) {
                        if (sortsaves[i]["saveName"] == saveName){

                            var match = i
                        }
                    }
                    sortsaves.splice(match,1);
                    savestuff(saveName,sortsaves);
                } else {
                    //do nothing
                }
            }
        });

        $("#deletebutton").on("click", function(){
            var saveName = $("#saveopts").val();
            var check = confirm("Are you sure you want to delete '"+saveName+"'?");

            if (check == true){
                for (var i = 0; i < sortsaves.length; i++) {
                    if (sortsaves[i]["saveName"] == saveName){
                        var match = i
                    }
                }
                sortsaves.splice(match,1);

                $("#save-"+saveName).remove();

                var loadNum = ($.inArray(saveName, savelist));

                savelist.splice(loadNum,1);

                if (sortsaves.length == 0){
                    var newoption = $("<option></option>")
                        .val("none")
                        .attr("id","nosave")
                        .attr("selected","selected")
                        .attr("disabled", "disabled")
                        .text("No saves yet!");

                    $("#saveopts").append(newoption);
                    window.localStorage.removeItem(savefile);

                } else {

                    var jsonBranches = JSON.stringify(sortsaves);
                    window.localStorage.setItem(savefile, jsonBranches);
                }               

            } else {
                //do nothing
            }

        });

        $("#exportbutton").on("click", function(){

            downloadString();
            
        });

            $( '#loadbutton' ).click( function () {
                if ( ! window.FileReader ) {
                    return alert( 'FileReader API is not supported by your browser.' );
                }
                var $i = $( '#browsebutton' ), // Put file input ID here
                    input = $i[0]; // Getting the element from jQuery
                if ( input.files && input.files[0] ) {
                    file = input.files[0]; // The file
                    fr = new FileReader(); // FileReader instance
                    fr.onload = function () {
                        // Do stuff on onload, use fr.result for contents of file
                        try {
                            testjson = JSON.parse(fr.result)
                            renderTree(testjson);
                        }
                        catch(err){
                            alert("The JSON file you have tried to load is not compatible with the Sorting Tool.")
                        }
 
                        //$( '#file-content' ).append( $( '<div/>' ).html( fr.result ) )
                    };
                    fr.readAsText( file );
                    //fr.readAsDataURL( file );
                } else {
                    // Handle errors here
                    alert( "File not selected or browser incompatible." )
                }

                $("#treeoptions").show();
                $("#closeleft").show();   
            });

        $("opts[value='0']").attr('selected', 'selected');
        GenerateCode();

        $('#opts').on('change', function() {

            $('#saveopts').val("blank");

            var newData = eval(d3.select(this).property('value'));
            renderTree(newData);
            //$("#feedback").hide();
            $("#treeoptions").show();
            $("#closeleft").show();            
        });


        $("#blankspace").on("click", function(){
            var rootname = prompt("Name your root node:");

            var isvalid = /^\w+( \w+)*$/.test(rootname);
                if (rootname == null){
                    alert("Blank workspace not created.");
                }
                //if the user clicks "OK" and the save name is valid...
                else if (isvalid == true){

                    var treeDataExtend = {
                            "name": "root",
                            "children": [{
                                "name": "branch",
                                "children": {
                                    "name": rootname
                                }
                            }, {
                                "name": "recycle",
                                "children": {
                                    "name": "recycle"
                                }
                            }]
                        };
                    renderTree(treeDataExtend);

                    $("#treeoptions").show();
                    $("#closeleft").show();  

                }


            
        });

        $('#saveopts').on('change', function() {
        
            $('#opts').val("blank");

            var newData = $(this).val();
            var loadNum = ($.inArray(newData, savelist));

            //load orignial Container elements
            var loadData = sortsaves[loadNum]["rootBranch"];
            var loadRecycle = sortsaves[loadNum]["rootRecycle"];
            var loadOrig = sortsaves[loadNum]["rootOrig"];

            //support for old Orphans node
            var loadOrphans = sortsaves[loadNum]["rootOrphans"];  
            
            try {
                //if loadRecycle exists...
                recycle = JSON.parse(loadRecycle);
            }
            catch {
                //else load older Orphans style
                recycle = JSON.parse(loadOrphans);
            }

            branch = JSON.parse(loadData);
            orig = JSON.parse(loadOrig);

            var treeDataExtend = {};
            treeDataExtend["name"] = "root";
            treeDataExtend["children"] = [recycle, branch, orig];

            renderTree(treeDataExtend);

            //$("#feedback").hide();
            $("#treeoptions").show();

        });


        $("#add_node").click(function() {
            AddNode();
            //clear input box
            $("#newnode").val("");
        });

        $("#hidebutton").on("click", function() {
            $("#feedback").toggle();
            $("#showbutton").toggle();
            $("#hidebutton").toggle();
        });


        $("#showbutton").on("click", function(){
            $("#feedback").toggle();
            $("#showbutton").toggle();
            $("#hidebutton").toggle();
        });

    });



    

})(jQuery);

//function to store new card info into browser localStorage
function storenewsave(newBranch,sortsaves){
    sortsaves.push(newBranch);
    var jsonBranches = JSON.stringify(sortsaves);
    window.localStorage.setItem(savefile, jsonBranches);
}

const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
};


function savestuff(saveName,sortsaves){
    var root = getRoot();
    var orig = getOrig();
    flattenTree(root, {});

    for (var i = 0; i < root["children"].length; i++) {
        delete root["children"][i]["parent"]

      if (root["children"][i]["name"] == "recycle") {

        recycle = {};
        recycle["name"] = "recycle";
        recycle["children"] = root["children"][i]

        recycle1 = JSON.stringify(recycle, getCircularReplacer());

      } else if (root["children"][i]["name"] == "orphan") {

        recycle = {};
        recycle["name"] = "recycle";
        recycle["children"] = root["children"][i]

        recycle1 = JSON.stringify(recycle, getCircularReplacer());

      } else {

        branch = {};
        branch["name"] = "branch";
        branch["children"] = root["children"][i]

        root1 = JSON.stringify(branch, getCircularReplacer());
      }
    }

    orig1 = {};
    orig1["name"] = "orig";
    orig1["children"] = orig;

    var rootBranch = root1.replace(/_children/gm,'children').replace(/,"children":null/gm,'').replace(/,"depth":\d*/gm,"").replace(/,"x":\d*.\d*,"y":\d*/gm,"").replace(/,"x0":\d*.\d*,"y0":\d*/gm,"").replace(/,"id":\d*/gm,"");

    var rootRecycle = recycle1.replace(/_children/gm,'children').replace(/,"children":null/gm,'').replace(/,"depth":\d*/gm,"").replace(/,"x":\d*.\d*,"y":\d*/gm,"").replace(/,"x0":\d*.\d*,"y0":\d*/gm,"").replace(/,"id":\d*/gm,"");

    var rootOrig = JSON.stringify(orig1);

    function NewBranchEntry(rootBranch,rootRecycle,rootOrig,saveName){
        this.rootBranch = rootBranch;
        this.rootRecycle = rootRecycle;
        this.rootOrig = rootOrig;
        this.saveName = saveName;
    }
    
    var newBranch = new NewBranchEntry(rootBranch,rootRecycle,rootOrig,saveName);

    storenewsave(newBranch,sortsaves);
}


function DoDiff() {
    var root = getRoot();
    var orig = getOrig();
    var diffStr = difftree(orig, root);
    downloadString(diffStr);
}

function AddNode() {
    var nodeName = $('#newnode').val();
    var errorDiv = $('#error');
    while (errorDiv.firstChild != null) {
        errorDiv.removeChild(errorDiv.firstChild);
    }
    if (!nodeName) {
        return;
    } else {
        addNode(nodeName, errorDiv);
    }
}

function downloadString() {

    var root = getRoot();
    var orig = getOrig();
    flattenTree(root, {});

    for (var i = 0; i < root["children"].length; i++) {
        delete root["children"][i]["parent"]

      if (root["children"][i]["name"] == "recycle") {

        recycle = {};
        recycle["name"] = "recycle";
        recycle["children"] = root["children"][i]

      } else {

        branch = {};
        branch["name"] = "branch";
        branch["children"] = root["children"][i]

      }
    }

    orig1 = {};
    orig1["name"] = "orig";
    orig1["children"] = orig;


    var section = {     "name" : "root",
                    "children":     [
                        {"name": "branch",
                        "children" : branch["children"]},
                        {"name": "recycle",
                        "children": recycle["children"]},
                        {"name":"orig",
                        "children":orig1["children"]}
                    ]
                };

    var exjson = JSON.stringify(section, getCircularReplacer());

    var exportjson = exjson.replace(/_children/gm,'children').replace(/,"children":null/gm,'').replace(/,"depth":\d*/gm,"").replace(/,"x":\d*.\d*,"y":\d*/gm,"").replace(/,"x0":\d*.\d*,"y0":\d*/gm,"").replace(/,"id":\d*/gm,"");

    var file = "data:text/plain;charset=utf-8,";
    var encoded = encodeURIComponent(exportjson);
    file += encoded;
    var a = document.createElement('a');
    a.href = file;
    a.target   = '_blank';
    a.download = "export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
};


function TestForm() {
    var root = getRoot();
    var orig = getOrig();
    var diffStr = difftree(orig, root);
    var url = '/email';
    var name = document.getElementById("first_name").value;
    var inst = document.getElementById("yourinst").value;
    var uremail = document.getElementById("youremail").value;
    var urnotes = document.getElementById("notes").value;
    d3.xhr(url)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .post("testarg=Name: " + name + "\n" + "Instituion: " + inst + "\n" + "Email: " + uremail + "\n" + "Notes: " + urnotes + "\n\nDifference File:\n" + diffStr);
}

function checkform(theform) {

    //so, do I wanna clear the form on submission?

    var why = "";

    try {
        var root = getRoot();

        if (theform.txtInput.value == "") {
            why += "Robot Check code should not be empty.";
        }
        if (theform.txtInput.value != "") {
        
            if (ValidCaptcha(theform.txtInput.value) == true) {
                why += "Thank you for your feedback!";
                TestForm();
            } else {
                why += "Robot Check code did not match.";
            }
        }

    } catch (error) {

        why += "you must select a branch to give feedback on"
    }

    if (why != "") {
        alert(why);
        return false;
    }
}

function ClearFields() {

    document.getElementById("txtInput").value = "";
}

function GenerateCode() {
    //Generates the captcha function
    var a = Math.ceil(Math.random() * 9) + "";
    var b = Math.ceil(Math.random() * 9) + "";
    var c = Math.ceil(Math.random() * 9) + "";
    var d = Math.ceil(Math.random() * 9) + "";
    var e = Math.ceil(Math.random() * 9) + "";

    var code = a + b + c + d + e;
    document.getElementById("txtCaptcha").value = code;
    document.getElementById("txtCaptchaDiv").innerHTML = code;
}

// Validate the Entered input aganist the generated security code function
function ValidCaptcha() {
    var str1 = removeSpaces(document.getElementById('txtCaptcha').value);
    var str2 = removeSpaces(document.getElementById('txtInput').value);
    if (str1 == str2) {
        ClearFields();
        GenerateCode();
        return true;
    } else {
        return false;
    }
}

// Remove the spaces from the entered and generated code
function removeSpaces(string) {
    return string.split(' ').join("");
}