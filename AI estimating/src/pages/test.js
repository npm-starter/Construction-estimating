let global_varHistory = {};
/* 
    These scale factors are "magic" numbers and driven by the scaling of the 
    images on the server side. They are imperically derived currently. 
*/
let mmScaleFactor = 2.83582089552;
let inScaleFactor = 72.1518987342;
let areaSqFtFactor= 748000;
let global_toolActive = false;
let global_AnnotList = [];
let global_pan_factor = 150;

function getBase64Image(img) {
    var canvas = document.createElement("canvas");

    canvas.width = img.width;
    canvas.height = img.height;

    var ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0);

    var dataURL = canvas.toDataURL("image/png");

    return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
}
  

function initBody(){
    // disable mouse drag event
    $('body').on('mouseup',function(e,ui){
        $('#dwgImage').off('mousemove');
    });
}

function initRotateDwgCW(){
    $('#dwgRotateCW').off();
    $('#dwgRotateCW').click(function(e,ui){
        $('#throbberMsg').text("Rotating the drawing.");
        $('#throbber').modal('show');
        var pageGuid = $("#pageGuid").val();
        $.ajax({
            url: `/est/rotateImg/${pageGuid}/`,
            method: 'POST',
            data: {'d': 'cw'},
            success: function(data){
                // loadDwgAudit(pageGuid);
                $('#throbber').modal('hide');
                location.reload();
            }
        });
    });
}

function initRotateDwgCCW(){
    $('#dwgRotateCCW').off();
    $('#dwgRotateCCW').click(function(e,ui){
        $('#throbberMsg').text("Rotating the drawing.");
        $('#throbber').modal('show');
        var pageGuid = $("#pageGuid").val();
        $.ajax({
            url: `/est/rotateImg/${pageGuid}/`,
            method: 'POST',
            data: {'d': 'ccw'},
            success: function(data){
                // loadDwgAudit(pageGuid);
                $('#throbber').modal('hide');
                location.reload();
            }
        });
    });
}

function initSvgTextAnnot(){
    $('#btnTextAnnot').off();
    $('#btnTextAnnot').click(function(e,ui){
        global_toolActive = true;
        var svg = $('#dwgImage svg')[0];
        var rootGroup = $('#dwgImage svg g')[0];
        var CMT = svg.getScreenCTM();
        // Set abort on Escape
        $(document).off('keyup');
        $(document).on('keyup', function(e) {
            if (e.key == "Escape"  && global_toolActive === true){
                $('#textAnnotDialog').fadeOut('normal');
                resetGuiEvents("#dwgImage");
                global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
            }
        });

        // set cursor to text
        $('#dwgImage').css('cursor','text');

        // set up mouse handler
        var relX=0;
        var relY=0;
        $('#dwgImage').off("mouseup");
        $('#dwgImage').on("mouseup", function(e){
            relX=(e.clientX-CMT.e)/CMT.a;
            relY=(e.clientY-CMT.f)/CMT.d;
            $('#textAnnotText').val("");
            $('#textAnnotDialog').css({top: e.clientY-20, left: e.clientX, position:'absolute'});
            $('#textAnnotDialog').fadeIn('normal');
            $('#textAnnotDialog').removeClass('d-none');
            $('#textAnnotText').focus();
        });

        // set button handlers
        // commit
        $('#textAnnotCommit').off();
        $('#textAnnotCommit').click(function(e,ui){
            var size = $('#textAnnotSize').val();
            var color = $('#textAnnotColor').val();
            var text = document.createElementNS("http://www.w3.org/2000/svg",'text');
            text.setAttributeNS(null,'x',relX);
            text.setAttributeNS(null,'y',relY-20); // offset to line up with cursor
            text.setAttributeNS(null,'font-family',"Ubuntu");
            text.setAttributeNS(null,'font-size',size);
            text.setAttributeNS(null,'fill',color);
            text.innerHTML = $('#textAnnotText').val();
            rootGroup.appendChild(text);
            sendData = {
                'itemGuid':'',
                'pageGuid': $("#pageGuid").val(),
                'g':[text.outerHTML,],
                'text':'',
                'auditGuid': '',
            }
            
            $.ajax({
                url:'/est/api/postAnnot/',
                method:'PUT',
                data: JSON.stringify(sendData),
                dataType: "json",
                success: function(data){
                    text.setAttributeNS(null,'id',data['annotIdList'][0]);
                    global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
                    resetGuiEvents('#dwgImage');
                },
                error: function(jqXHR,status,errorThrown){
                    if(jqXHR.status != '500'){
                        var msg = jqXHR.responseJSON['msg']
                        var existingError = $('#att').find('.alert-danger')
                        if(existingError.length > 0){
                            existingError.fadeOut('slow',function(){
                                $(this).remove();
                                $('#att').prepend(`<div class='alert alert-danger'>${msg}</div>`)
                            });
                        }else{
                            $('#att').prepend(`<div class='alert alert-danger'>${msg}</div>`)
                        }
                        
                    }else{
                        $('#att').find('.alert-danger').fadeOut('slow',function(){
                            $(this).remove();
                        });
                        $('#att').prepend(`<div class='alert alert-danger'>An error has occured on the server while submitting this takeoff, please send us a message using the help form in the top right as soon as possible.</div>`)
                    }
                }
            });
            $('#textAnnotDialog').fadeOut('normal');
            resetGuiEvents("#dwgImage");
            global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
        });
        // abort
        $('#textAnnotAbort').off();
        $('#textAnnotAbort').click(function(e,ui){
            $('#textAnnotDialog').fadeOut('normal');
            resetGuiEvents("#dwgImage");
            global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
        });
    });
}

function svgZoomIn(zoomFct=200){
    var svg = $('#dwgImage svg')[0];
    var box = svg.viewBox.baseVal;
    var zoomBox = [box.x,box.y,box.width-zoomFct,box.height-zoomFct];
    svg.setAttribute('viewBox',zoomBox.join(" "));
}

function svgZoomOut(zoomFct=200){
    var svg = $('#dwgImage svg')[0];
    var box = svg.viewBox.baseVal;
    var zoomBox = [box.x,box.y,box.width+zoomFct,box.height+zoomFct];
    svg.setAttribute('viewBox',zoomBox.join(" "));
}

function selectCircle(selector){
    var cx = parseFloat($(selector).attr('cx'));
    var cy = parseFloat($(selector).attr('cy'));
    var r = parseFloat($(selector).attr('r'));
    var circle = document.createElementNS("http://www.w3.org/2000/svg",'circle');
    circle.setAttributeNS(null,'cx',cx);
    circle.setAttributeNS(null,'cy',cy);
    circle.setAttributeNS(null,'r',r);
    circle.setAttributeNS(null,'class',"selected");
    circle.setAttributeNS(null,'stroke','yellow');
    circle.setAttributeNS(null,'stroke-width',2);
    circle.setAttributeNS(null,'fill','yellow');
    circle.setAttributeNS(null,'fill-opacity',0.25);
    circle.setAttributeNS(null,'id',"sel_"+$(selector).attr('id'));
    $(selector).after(circle);
}

function initScaleMenu(som){
    $('#btnSetScaleMenu').click(function(e,ui){
        $('#setScaleMenu').toggleClass('d-none');
        $('#scaleTakeMeasure').off();
        $('#scaleTakeMeasure').click(function(e,ui){
            scaleTakeMeasure(som);                
        });
    });
}

function scaleTakeMeasure(som){
    // remove existing line
    if($("line[data-type='scaleMeasureLine']").length > 0){
        var id = $("line[data-type='scaleMeasureLine']").attr('id');
        var pageGuid=$("#pageGuid").val();
        $("line[data-type='scaleMeasureLine']").remove();
        sendData={
            'pageGuid': pageGuid,
            'annotId': id
        };
        $.ajax({
            url:'delAnnot/',
            method: "POST",
            data: JSON.stringify(sendData),
            success: function(data){
                $("#dwgImage svg #"+id).remove();
                $("#dwgImage svg .selected").remove();
            }
        });
    }

    var svg = $('#dwgImage svg g')[0];
    var CMT = svg.getScreenCTM();
    var line = document.createElementNS("http://www.w3.org/2000/svg",'line');
    // resetGuiEvents('#dwgImage');
    $('#dwgImage').data('clicked',false);

    $('#dwgImage').css('cursor','crosshair')
    $('#dwgImage').on('mouseup',function(e,ui){
        if(e.button!=1){
            if($(this).data('clicked') === false){
                var relX=(e.clientX-CMT.e)/CMT.a;
                var relY=(e.clientY-CMT.f)/CMT.d;            
                line.setAttributeNS(null,'x1',relX);
                line.setAttributeNS(null,'y1',relY);
                line.setAttributeNS(null,'x2',relX+2);
                line.setAttributeNS(null,'y2',relY+2);
                line.setAttributeNS(null,'data-type',"scaleMeasureLine");
                line.setAttributeNS(null,'stroke','green');
                line.setAttributeNS(null,'stroke-width',8);
                svg.appendChild(line);
                $(this).data('clicked',true);
            }else{
                var lineLength = line.getTotalLength();
                var lineLengthmm = Math.round(lineLength/mmScaleFactor*100)/100;
                var lineLengthinch = Math.round(lineLength/inScaleFactor*100)/100;
                var lineLengthft = Math.round(lineLengthinch/12*100)/100;
                if(som === "IMP"){
                    $('#scaleDwgMeasurement').val(`${lineLengthft} ft`);
                }else{
                    $('#scaleDwgMeasurement').val(`${lineLengthmm} mm`);
                }
                resetGuiEvents(this);
            }
        }
    });
    $('body').on('mousemove',function(e){
        if($('#dwgImage').data('clicked') === true){
            var relX2=(e.clientX-CMT.e)/CMT.a;
            var relY2=(e.clientY-CMT.f)/CMT.d;
            line.setAttributeNS(null,'x2',relX2);
            line.setAttributeNS(null,'y2',relY2);
        }
    });
}

function saveScale(som){
    $('#btnScaleApply').click(function(e,ui){
        var dwgMeasure = parseFloat($('#scaleDwgMeasurement').val().replace('ft','').replace('mm',''));
        var actMeasure = parseFloat($('#scaleActualMeasure').val().replace('ft','').replace('mm',''));
        var scaleRatio = Math.round(actMeasure/dwgMeasure*100)/100;
        var pgGuid=$("#pageGuid").val();
        var g = $("line[data-type='scaleMeasureLine']").prop('outerHTML');
        var annot = {'itemGuid': null,"g":g,"text":"Scale Measure"}

        if(dwgMeasure){
            if(dwgMeasure < 0.001){
                alert("Please measure a known distance on the drawing.");
                return false;
            }
        }else{
            alert("Please measure a known distance on the drawing.");
            $('#scaleTakeMeasure').addClass(' alert-warning');
            return false;
        }

        if(!(actMeasure > 0)){
            alert("Please enter the actual distance for the measured line.");
            return false;
        }

        if(som === "IMP"){
            $('#btnCurrentScale').html(`${dwgMeasure}ft : ${actMeasure}ft`);
        }else{
            $('#btnCurrentScale').html(`${dwgMeasure}mm : ${actMeasure}mm`);
        }        
        $('#dwgImage').data('scale-ratio',scaleRatio);
        sendData={
            'pgGuid': pgGuid,
            'dwgMeasure': dwgMeasure,
            'actMeasure': actMeasure,
            'annot': annot
        }
        $.ajax({
            url: 'setScale/',
            method: "POST",
            data: JSON.stringify(sendData),
            success: function(data){
            }
        });
        $('#setScaleMenu').addClass('d-none');
    });
}

function selectObj(){
     
    var htPointR = 10;
    
    // SVG Selection Interaction
    // rectangle items
    $('#rootGroup > g').off('click');
    $('#rootGroup > g').click(function(e,ui){
        var bbox = this.getBBox();
        var transform = this.getAttributeNS(null, 'transform')
        var rect = document.createElementNS("http://www.w3.org/2000/svg",'rect');
        rect.setAttributeNS(null,'x',bbox.x);
        rect.setAttributeNS(null,'y',bbox.y);
        rect.setAttributeNS(null,'width',bbox.width);
        rect.setAttributeNS(null,'height',bbox.height);
        rect.setAttributeNS(null,'class',"selected");
        rect.setAttributeNS(null,'stroke','yellow');
        rect.setAttributeNS(null,'stroke-width',2);
        rect.setAttributeNS(null,'fill','yellow');
        rect.setAttributeNS(null,'fill-opacity',0.25);
        rect.setAttributeNS(null,'id',"sel_"+$(this).attr('id'));
        rect.setAttributeNS(null,'transform',transform);
        $(this).after(rect);
    });

    $('#rootGroup > use').off('click');
    $('#rootGroup > use').click(function(e,ui){
        bbox = this.getBBox();
        var rect = document.createElementNS("http://www.w3.org/2000/svg",'rect');
        rect.setAttributeNS(null,'class',"selected");
        rect.setAttributeNS(null,'stroke','yellow');
        rect.setAttributeNS(null,'stroke-width',2);
        rect.setAttributeNS(null,'fill','yellow');
        rect.setAttributeNS(null,'fill-opacity',0.25);
        rect.setAttributeNS(null,'id',"sel_"+$(this).attr('id'));
        rect.setAttributeNS(null,'x',bbox.x);
        rect.setAttributeNS(null,'y',bbox.y);
        rect.setAttributeNS(null,'width',bbox.width);
        rect.setAttributeNS(null,'height',bbox.height);
        var transform = this.getAttributeNS(null, 'transform')
        rect.setAttributeNS(null,'transform',transform);
        $(this).after(rect);
    });

    $('#rootGroup > polyline').off('click');
    $('#rootGroup > polyline').click(function(e,ui){
        var points = $(this).attr('points');
        var baseID = $(this).attr('id');
        var basePl = this;

        var pl = document.createElementNS("http://www.w3.org/2000/svg",'polyline');
        pl.setAttributeNS(null,'class',"selected");
        pl.setAttributeNS(null,'stroke','yellow');
        pl.setAttributeNS(null,'stroke-width',40);
        pl.setAttributeNS(null,'stroke-linecap',"round");
        pl.setAttributeNS(null,'opacity',0.5);
        pl.setAttributeNS(null,'points',points);
        pl.setAttributeNS(null,'id',`sel_${baseID}`);
        pl.setAttributeNS(null,'fill-opacity',0);
        $(this).after(pl);

        var cp = document.createElementNS("http://www.w3.org/2000/svg",'circle');
        // cp.setAttributeNS(null,'id',`cp_${baseID}`);
        cp.setAttributeNS(null,'class','controlPoint');
        cp.setAttributeNS(null,'r',htPointR);
        pointList = [];
        $.each(points.split(','),function(i){
            var point = this.trim().split(" ");
            pointList.push(point);
            x = point[0];
            y = point[1];
            cp = $(cp).clone()[0];
            cp.setAttributeNS(null,'id',`cp_${baseID}_${i}`);
            cp.setAttributeNS(null,'cx',x);
            cp.setAttributeNS(null,'cy',y);
            pl.after(cp);
        });

        $('.controlPoint').on('mousedown', function(e,ui){
            var svg = $('#dwgImage svg');
            svg.off()
            svg = svg[0];
            var CMT = svg.getScreenCTM();
            var thisCp = this;
            var twinCp = $(`.controlPoint[cx="${thisCp.getAttributeNS(null,'cx')}"][cy="${thisCp.getAttributeNS(null,'cy')}"]`)[0];
            
            var cpIndex = $(this).attr('id').split("_")[2];
            var twinIndex = $(twinCp).attr('id').split("_")[2];
            $('#dwgImage').mousemove(function(e){
                var relX=(e.clientX-CMT.e)/CMT.a;
                var relY=(e.clientY-CMT.f)/CMT.d;
                thisCp.setAttributeNS(null,'cx',relX);
                thisCp.setAttributeNS(null,'cy',relY);
                twinCp.setAttributeNS(null,'cx',relX);
                twinCp.setAttributeNS(null,'cy',relY);
                // The highlight polyline overlay
                highlightPoints = pl.getAttributeNS(null,'points').split(',');
                highlightPoints[cpIndex] = [relX, relY].join(" ");
                highlightPoints[twinIndex] = [relX, relY].join(" ");
                // the base polyline thats been selected
                basePlPoints = basePl.getAttributeNS(null,'points').split(',');
                basePlPoints[cpIndex] = [relX, relY].join(" ");
                basePlPoints[twinIndex] = [relX, relY].join(" ");

                pl.setAttributeNS(null,'points',highlightPoints.join(","));
                basePl.setAttributeNS(null,'points',basePlPoints.join(","));
            });
            $('.controlPoint').on('mouseup',function(e,ui){
                $(this).off();
                $('#dwgImage').off('mousemove');
                $('.controlPoint').fadeOut('normal', function(){
                    $(this).remove();
                });
                resetGuiEvents(this);
                var pageGuid=$("#pageGuid").val();
                var auditGuid = $(basePl).data('audit-guid');
                // get the new length to send over
                var scaleRatio = parseFloat($('#dwgImage').data('scale-ratio'));
                var lineLength = basePl.getTotalLength();
                var lineLengthmm = Math.round(lineLength/mmScaleFactor*100)/100;
                var lineLengthinch = Math.round(lineLength/inScaleFactor*100)/100;
                var lineLengthft = Math.round(lineLengthinch/12*100)/100;
                var som = $("#som").val();
                var newLength = 0.0;
                if(som === "IMP"){
                    newLength = Math.round(scaleRatio * lineLengthft *100)/100;
                }else{
                    newLength = Math.round(scaleRatio * lineLengthmm *100)/100;
                }
                // div by 2 because the polylines are closed back on themselves
                newLength = newLength / 2.0;
                newGraphicStr = basePl.outerHTML;
                sendData={
                    'pageGuid': pageGuid,
                    'annotId': baseID,
                    'newGraphic': newGraphicStr,
                    'auditGuid': auditGuid,
                    'quantity': newLength
                };
                $.ajax({
                    url:'updateAnnot/',
                    method: 'POST',
                    data: sendData,
                    success: function(data){
                        $('#auditTrail').DataTable().ajax.reload(auditTools, false);
                        $('svg .selected').fadeOut('normal', function(){
                            $(this).remove();
                        });
                    }
                });
            });
        });
    });

    $('#rootGroup > rect').off('click');
    $('#rootGroup > rect').click(function(e,ui){
        $(".controlPoint").remove();
        var baseRectID = $(this).attr('id');
        var baseRect = this;
        // Set up grab points
        var circleTL = document.createElementNS("http://www.w3.org/2000/svg",'circle');
        circleTL.setAttributeNS(null,'id','rectHotPointTl_'+baseRectID);
        circleTL.setAttributeNS(null,'class','controlPoint tL');
        circleTL.setAttributeNS(null,'r',htPointR);
        
        var circleTR = document.createElementNS("http://www.w3.org/2000/svg",'circle');
        circleTR.setAttributeNS(null,'id','rectHotPointTr_'+baseRectID);
        circleTR.setAttributeNS(null,'class','controlPoint tR');
        circleTR.setAttributeNS(null,'r',htPointR);
        
        var circleBL = document.createElementNS("http://www.w3.org/2000/svg",'circle');
        circleBL.setAttributeNS(null,'id','rectHotPointBl_'+baseRectID);
        circleBL.setAttributeNS(null,'class','controlPoint bL');
        circleBL.setAttributeNS(null,'r',htPointR);

        var circleBR = document.createElementNS("http://www.w3.org/2000/svg",'circle');
        circleBR.setAttributeNS(null,'id','rectHotPointBr_'+baseRectID);
        circleBR.setAttributeNS(null,'class','controlPoint bR');
        circleBR.setAttributeNS(null,'r',htPointR);

        var x=parseFloat($(this).attr('x'))-1;
        var y=parseFloat($(this).attr('y'))-1;
        var w=parseFloat($(this).attr('width'))+1;
        var h=parseFloat($(this).attr('height'))+1;
        var transformOrg=$(this).attr("transform-origin");
        var transform=$(this).attr("transform");
        var rect = document.createElementNS("http://www.w3.org/2000/svg",'rect');
        rect.setAttributeNS(null,'x',x);
        rect.setAttributeNS(null,'y',y);
        rect.setAttributeNS(null,'width',w);
        rect.setAttributeNS(null,'height',h);
        rect.setAttributeNS(null,'transform-origin',transformOrg);
        if (transform){
            rect.setAttributeNS(null,'transform',transform);
        }

        rect.setAttributeNS(null,'class',"selected");
        rect.setAttributeNS(null,'stroke','yellow');
        rect.setAttributeNS(null,'stroke-width',2);
        rect.setAttributeNS(null,'fill','yellow');
        rect.setAttributeNS(null,'fill-opacity',0.25);
        rect.setAttributeNS(null,'id',"sel_"+$(this).attr('id'));

        if (transform){
            var transMatrix = baseRect.transform.baseVal.consolidate().matrix;
        }
        var ptTL = baseRect.ownerSVGElement.createSVGPoint();
        var ptTR = baseRect.ownerSVGElement.createSVGPoint();
        var ptBL = baseRect.ownerSVGElement.createSVGPoint();
        var ptBR = baseRect.ownerSVGElement.createSVGPoint();
        var transRelPt = baseRect.ownerSVGElement.createSVGPoint();
    
        ptTL.x = x;
        ptTL.y = y;
        ptTR.x = x+w;
        ptTR.y = y;
        ptBL.x = x;
        ptBL.y = y+h;
        ptBR.x = x+w;
        ptBR.y = y+h;

        if (transform){
            ptTL = ptTL.matrixTransform(transMatrix);
            ptTR = ptTR.matrixTransform(transMatrix);
            ptBL = ptBL.matrixTransform(transMatrix);
            ptBR = ptBR.matrixTransform(transMatrix);
        }

        circleTL.setAttributeNS(null,'cx',ptTL.x);
        circleTL.setAttributeNS(null,'cy',ptTL.y);
        circleTR.setAttributeNS(null,'cx',ptTR.x);
        circleTR.setAttributeNS(null,'cy',ptTR.y);
        circleBL.setAttributeNS(null,'cx',ptBL.x);
        circleBL.setAttributeNS(null,'cy',ptBL.y);
        circleBR.setAttributeNS(null,'cx',ptBR.x);
        circleBR.setAttributeNS(null,'cy',ptBR.y);

        $(this).after(rect);
        if (!transform){
            rect.after(circleTL);
            rect.after(circleTR);
            rect.after(circleBL);
            rect.after(circleBR);
        }

        // Setup hot point events
        // Setup hotPoints to resize items
        $('.controlPoint').on('mousedown',function(e, ui){
            var svg = $('#dwgImage svg');
            svg.off()
            svg = svg[0];
            var CMT = svg.getScreenCTM();

            var htPt = $(this).attr('id').split('_')[0].slice(-2);
            var relX;
            var relY;
            var tlX = ptTL.x;
            var tlY = ptTL.y;
            var trX = ptTR.x;
            var trY = ptTR.y;
            var blX = ptBL.x;
            var blY = ptBL.y;
            var brX = ptBR.x;
            var brY = ptBR.y;
            if(htPt == "Tl"){
                $('#dwgImage').mousemove(function(e){
                    relX=(e.clientX-CMT.e)/CMT.a;
                    relY=(e.clientY-CMT.f)/CMT.d;
                    width = brX - relX;
                    height = brY - relY;
                    circleTL.setAttributeNS(null,'cx',relX);
                    circleTL.setAttributeNS(null,'cy',relY);
                    circleTR.setAttributeNS(null,'cy',relY);
                    circleBL.setAttributeNS(null,'cx',relX);
                    rect.setAttributeNS(null,'x',relX);
                    rect.setAttributeNS(null,'y',relY);
                    rect.setAttributeNS(null,'width',width);
                    rect.setAttributeNS(null,'height',height);
                    baseRect.setAttributeNS(null,'x',relX);
                    baseRect.setAttributeNS(null,'y',relY);
                    baseRect.setAttributeNS(null,'width',width);
                    baseRect.setAttributeNS(null,'height',height);
                });
            }else if(htPt == "Tr"){
                $('#dwgImage').mousemove(function(e){
                    relX=(e.clientX-CMT.e)/CMT.a;
                    relY=(e.clientY-CMT.f)/CMT.d;
                    width = relX - baseRect.getAttribute('x');
                    height = brY - relY;
                    circleTR.setAttributeNS(null,'cx',relX);
                    circleTR.setAttributeNS(null,'cy',relY);
                    circleTL.setAttributeNS(null,'cy',relY);
                    circleBR.setAttributeNS(null,'cx',relX);
                    rect.setAttributeNS(null,'width',width);
                    rect.setAttributeNS(null,'height',height);
                    rect.setAttributeNS(null,'y',relY);
                    baseRect.setAttributeNS(null,'width',width);
                    baseRect.setAttributeNS(null,'height',height);
                    baseRect.setAttributeNS(null,'y',relY);
                });
            }else if(htPt == "Bl"){
                $('#dwgImage').mousemove(function(e){
                    relX=(e.clientX-CMT.e)/CMT.a;
                    relY=(e.clientY-CMT.f)/CMT.d;
                    width = brX - relX;
                    height = relY - baseRect.getAttribute('y');
                    circleBL.setAttributeNS(null,'cx',relX);
                    circleBL.setAttributeNS(null,'cy',relY);
                    circleTL.setAttributeNS(null,'cx',relX);
                    circleBR.setAttributeNS(null,'cy',relY);
                    rect.setAttributeNS(null,'x',relX);
                    rect.setAttributeNS(null,'width',width);
                    rect.setAttributeNS(null,'height',height);
                    baseRect.setAttributeNS(null,'x',relX);
                    baseRect.setAttributeNS(null,'width',width);
                    baseRect.setAttributeNS(null,'height',height);
                });
            }else if(htPt == "Br"){
                $('#dwgImage').mousemove(function(e){
                    relX=(e.clientX-CMT.e)/CMT.a;
                    relY=(e.clientY-CMT.f)/CMT.d;
                    transRelPt.x = relX;
                    transRelPt.y = relY;
                    // transRelPt = transRelPt.matrixTransform(transMatrix);

                    width = Math.abs(transRelPt.x - baseRect.getAttributeNS(null,'x'));
                    height = Math.abs(transRelPt.y - baseRect.getAttributeNS(null,'y'));
                    circleBR.setAttributeNS(null,'cx',relX);
                    circleBR.setAttributeNS(null,'cy',relY);
                    circleBL.setAttributeNS(null,'cx',transRelPt.x);
                    circleBL.setAttributeNS(null,'cy',transRelPt.y);
                    circleTR.setAttributeNS(null,'cx',relX);
                    rect.setAttributeNS(null,'width',width);
                    rect.setAttributeNS(null,'height',height);
                    // rect.setAttributeNS(null,'x',relX);
                    baseRect.setAttributeNS(null,'width',width);
                    baseRect.setAttributeNS(null,'height',height);
                    // baseRect.setAttributeNS(null,'x',relX);
                });
            }
            $('.controlPoint').on('mouseup',function(e,ui){
                $(this).off('mouseup');
                $('#dwgImage').off('mousemove');
                $(".controlPoint").remove();
                resetGuiEvents(this);
                var pageGuid=$("#pageGuid").val();
                var id=$('svg .selected').attr('id');
                id=id.replace("sel_",'');
                newGraphicStr = baseRect.outerHTML;
                sendData={
                    'pageGuid': pageGuid,
                    'annotId': id,
                    'newGraphic': newGraphicStr
                };
                $.ajax({
                    url:'updateAnnot/',
                    method: "POST",
                    data:sendData,
                    success: function(data){
                        $("#dwgImage svg .selected").remove();
                    }
                });
            });
        });
    });

    // polygon items
    $('#rootGroup > polygon').off('click');
    $('#rootGroup > polygon').click(function(e, ui){
        var points = $(this).attr('points');
        var poly = document.createElementNS("http://www.w3.org/2000/svg",'polygon');
        poly.setAttributeNS(null,'class',"selected");
        poly.setAttributeNS(null,'stroke','yellow');
        poly.setAttributeNS(null,'stroke-width',2);
        poly.setAttributeNS(null,'fill','yellow');
        poly.setAttributeNS(null,'fill-opacity',0.25);
        poly.setAttributeNS(null,'id',"sel_"+$(this).attr('id'));
        poly.setAttributeNS(null,"points", points);
        $(this).after(poly);
    });

    // circle items
    $('#rootGroup > circle').off('click');
    $('#rootGroup > circle').not('.controlPoint').click(function(e, ui){
        selectCircle(this);
    });

    // line items
    $('#rootGroup > line').off('click');
    $('#rootGroup > line').click(function(e,ui){
        var x1 = $(this).attr('x1');
        var y1 = $(this).attr('y1');
        var x2 = $(this).attr('x2');
        var y2 = $(this).attr('y2');
        var line = document.createElementNS("http://www.w3.org/2000/svg",'line');
        line.setAttributeNS(null,'x1',x1);
        line.setAttributeNS(null,'y1',y1);
        line.setAttributeNS(null,'x2',x2);
        line.setAttributeNS(null,'y2',y2);
        line.setAttributeNS(null,'class',"selected");
        line.setAttributeNS(null,'stroke','yellow');
        line.setAttributeNS(null,'stroke-width',8);
        line.setAttributeNS(null,'id',"sel_"+$(this).attr('id'));
        $(this).after(line);
    });

    // text items
    $('#rootGroup > text').off('click');
    $('#rootGroup > text').click(function(e,ui){
        var bbox = this.getBBox();
        var x = $(this).attr('x');
        var y = $(this).attr('y') - bbox.height + 10;
        var w = bbox.width;
        var h = bbox.height;

        var rect = document.createElementNS("http://www.w3.org/2000/svg",'rect');
        rect.setAttributeNS(null,'x',x);
        rect.setAttributeNS(null,'y',y);
        rect.setAttributeNS(null,'width',w);
        rect.setAttributeNS(null,'height',h);
        rect.setAttributeNS(null,'class',"selected");
        rect.setAttributeNS(null,'stroke','yellow');
        rect.setAttributeNS(null,'stroke-width',2);
        rect.setAttributeNS(null,'fill','yellow');
        rect.setAttributeNS(null,'fill-opacity',0.25);
        rect.setAttributeNS(null,'id',"sel_"+$(this).attr('id'));

        $(this).after(rect);
    });
}

function initContextMenuDrawing(){ 
    $('#dwgImage').off('contextmenu');
    $('#dwgImage').on('contextmenu', function(e){
        e.preventDefault();
        if(global_toolActive === false){
            var top = e.pageY - 10;
            var left = e.pageX - 90;
            $("#context-menu-drawing").css({
                display: "block",
                top: top,
                left: left
            }).addClass("show");
        }else {
            global_toolActive = false; // THIS NEEDS TO ONLY HAPPEN HERE and ABORT     
        }
        return(false);
    }).on("click", function() {
        $("#context-menu-drawing").removeClass("show").hide();
    });

    $("#context-menu-drawing a").on("click", function() {
        $(this).parent().removeClass("show").hide();
    });

    // MENU ACTION ITEMS
    $('#actDrawingMenuBtnCpy').off();
    $('#actDrawingMenuBtnCpy').click(function(e,ui){
        if(global_toolActive != true){
            global_toolActive = true;
            abortHandler = false;
            
            $('#context-menu-drawing').removeClass('show').hide();
            
            // Escape to cancel
            $(document).on('keyup', function(e) {
                if (e.key == "Escape" && global_toolActive === true){
                    $.each(global_AnnotList,function(i){
                        $(this).fadeOut('normal',function(){
                            $(this).remove();
                        });
                    });
                    $('#att').empty();
                    global_AnnotList = [];
                    resetGuiEvents("#dwgImage");
                    global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
                }
            });

            var svg = $('#dwgImage svg g')[0];
            var CMT = svg.getScreenCTM();
            var relX;
            var relY;
            // var selectedAnnotAuditIds = [];
            var selectedAnnotAuidtIdsQtyMap = {};
            // create element group
            var group = document.createElementNS("http://www.w3.org/2000/svg",'g');
            $('svg .selected').each(function(i){
                if(abortHandler === false){
                    id = $(this).attr('id').replace('sel_','');
                    annot = $(svg).find(`#${id}`)[0];
                    if($(annot).is('g')){
                        abortHandler = true;
                        $('svg .selected').fadeOut('normal',function(){
                            $(this).remove();
                        });
                        alert("Warning: Grouped annotation items can not be coppied at this time.");
                        $('#att').empty();
                        resetGuiEvents(this);
                        return(false);
                    }
                    annotCopy = $(annot).clone()[0];
                    annotCopy.setAttributeNS(null,'id','');
                    annotCopy.setAttributeNS(null,'data-audit-guid','')
                    group.appendChild(annotCopy);
                    auditGuid = $(annot).data('audit-guid');
                    if(auditGuid in selectedAnnotAuidtIdsQtyMap){
                        selectedAnnotAuidtIdsQtyMap[auditGuid]+=1;
                    }else{
                        selectedAnnotAuidtIdsQtyMap[auditGuid]=1;
                    }
                }else{
                    return(false);
                }
            });

            if(abortHandler === true){
                return(false);
            }

            // append the group to the SVG
            svg.appendChild(group);
            // get group bounding box (to calc transform later)
            groupBB = group.getBBox();

            // clear selected items
            $('svg .selected').fadeOut('normal', function(){
                $(this).remove();
            });
            $('.controlPoint').fadeOut('normal', function(){
                $(this).remove();
            });

            var qtyTotal = 0;
            // var annotList = [group,];
            global_AnnotList = [group,]

            $('#dwgImage').off();
            $('#att').append(`
                <div class="row" style="height: 5em;">
                    <div class='col-lg-3' style="margin-top: 2em;">
                        <label for='qty'>Qty (Copy)</label>
                    </div>
                    <div class='col-lg-9' style="margin-top: 1em;">
                        <input id='takeoffQty' name='qty' value='0' disabled>
                    </div>
                </div>
                <div class="row w-100" style="height: 5em;">
                    <div class='col-lg-6' style="margin-top: 2em;">
                        <button id='cancelCopy' class='btn btn-danger' type='button'><i class='fad fa-ban'></i> Cancel</button>
                    </div>
                    <div id='commitTakeoff' class='col-lg-6' style="margin-top: 2em;">
                        <button id='commitCopy' class='btn btn-success' type='button'><i class="fas fa-check-square"></i> Commit</button>
                    </div>
                </div>
            `);

            function commitCopy(){
                global_AnnotList[global_AnnotList.length - 1].remove(); // dump the last annot, as it was what we were moving
                global_AnnotList.pop();
                var annotList = global_AnnotList
                sendData={
                    'copyAuditGuids': selectedAnnotAuidtIdsQtyMap,
                    'quantity': qtyTotal
                }
                $.ajax({
                    url: `copyAuditRow/`,
                    method: 'POST',
                    data: JSON.stringify(sendData),
                    dataType: 'json',
                    success: function(data){

                        guidList = []
                        g = []
                        $.each(data['guidMap'],function(i){
                            guidList.push(this['copy']);
                        });
                        var annotsTmp = [];
                        $.each(annotList,function(i){
                            this.setAttributeNS(null,'data-audit-guid',guidList.join(','));
                            $(this).attr('id','');
                            annotsTmp.push(this.outerHTML);
                            g.push(this);
                        });
                        sendData = {
                            'itemGuid':'',
                            'pageGuid': $("#pageGuid").val(),
                            'g':annotsTmp,
                            'text':'',
                            'auditGuid': guidList.join(','),
                        }
                        $.ajax({
                            url:'/est/api/postAnnot/',
                            method:'PUT',
                            data: JSON.stringify(sendData),
                            dataType: "json",
                            success: function(data){
                                $.each(g,function(i){
                                    this.setAttributeNS(null,'id',data['annotIdList'][i]); 
                                });
                                selectObj();
                                $('#att').empty();
                                $('#auditTrail').DataTable().ajax.reload(auditTools, false);
                                mapRowToAnnot($('#auditTrail').DataTable());
                            }
                        });
                    }
                });
                $('#att').empty();
                resetGuiEvents('#dwgImage');
                // global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
            }

            $('#commitCopy').off();
            $('#commitCopy').click(function(e,ui){
                commitCopy();
            });

            $('#cancelCopy').click(function(e,ui){
                $.each(global_AnnotList,function(i){
                    $(this).fadeOut('normal',function(){
                        $(this).remove();
                    });
                })
                $('#att').empty();
                global_AnnotList = [];
                resetGuiEvents("#dwgImage");
                global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
            });

            var PANNING = false;
            var pan_box = null;
            var pan_box_x = null;
            var pan_box_y = null;
            var pan_init_x= null;
            var pan_init_y= null;

             // EVENTS
             $('#dwgImage').on('mousedown',function(e){
                if(e.button == 1){ // aka middle button
                    PANNING = true;
                    pan_box = $('#dwgImage svg')[0].viewBox.baseVal;
                    pan_box_x = $('#dwgImage svg')[0].viewBox.baseVal.x;
                    pan_box_y = $('#dwgImage svg')[0].viewBox.baseVal.y;
                    pan_init_x = e.clientX;
                    pan_init_y = e.clientY;
                }
            });

            $('#dwgImage').on('mouseup',function(e,ui){
                if(e.button == 0){ // left mouse button
                    group = $(group).clone()[0];
                    
                    global_AnnotList.push(group);
                    svg.appendChild(group);

                    qtyTotal += 1;

                    $('#takeoffQty').val(qtyTotal);

                }else if(e.button == 1){ // middle mouse button
                    PANNING = false;
                    pan_init_x = null;
                    pan_init_y = null;
                }else if(e.button == 2){ // right mouse button
                    commitCopy();
                }
            });

            $('#dwgImage svg').off();
            $('#dwgImage svg').on('mousemove',function(e){
                if(PANNING === true){
                    CMT = svg.getScreenCTM();
                    toolPan(e,pan_box,pan_init_x,pan_init_y,pan_box_x,pan_box_y);
                }
                relX=(e.clientX-CMT.e)/CMT.a - groupBB.x;
                relY=(e.clientY-CMT.f)/CMT.d - groupBB.y;
                const re = /(translate\([-0-9,. ]+\))/g;
                var trans = group.getAttributeNS(null,'transform');
                if(trans){
                    trans = trans.replace(re,`translate(${relX}, ${relY})`);
                }else{
                    trans = `translate(${relX}, ${relY})`;
                }
                group.setAttributeNS(null,'transform',trans);
            });

            $(document).off('keydown');
            $(document).on('keydown', function(e){
                if(e.keyCode == 82) {
                    var rotateConst = 30;
                    var transform = group.getAttributeNS(null, 'transform');
                    var rotation = rotateConst;
                    const re = /(rotate\([-0-9,. ]+\))/g;
                    if(transform.search(re) > 0){
                        const reRotation = /([-0-9.]\d*)/g;
                        rotation = transform.match(re)[0].match(reRotation)[0];
                        if(rotation <= 330){
                            rotation = parseInt(rotation)+rotateConst
                        }else{
                            rotation = 0;
                        }
                        transform = transform.replace(re,`rotate(${rotation}, ${groupBB.x}, ${groupBB.y})`);
                    }else{
                        transform += ` rotate(${rotation}, ${groupBB.x}, ${groupBB.y})`;
                    }
                    group.setAttributeNS(null,'transform',transform);
                }
            });
        }
    });
}

function delAnnot(){
    var estGuid = $('#estGuid').val();
    var pageGuid=$("#pageGuid").val();
    var id=$('svg .selected').attr('id');
    id = id.replace("sel_",'');
    
    var attr = $(`#${id}`).attr('data-assembly-item-guid');
    if(typeof attr !== 'undefined'){
        alert("ERROR: This annotation is part of a Typical and can only be edited while editing its related Typical.");
    }else{
        auditGuids = [];
        if($("#dwgImage svg #"+id).is('g')){
            auditGuids = $("#dwgImage svg #"+id).data('audit-guid').split(",");
        }else{
            auditGuids.push($(`#${id}`).data('audit-guid'));
        }

        sendData={
            'pageGuid': pageGuid,
            'annotId': id,
            'auditGuid': auditGuids
        };
        $.ajax({
            url:`/est/openEst/${estGuid}/delAnnot/`,
            method: "POST",
            data: JSON.stringify(sendData),
            success: function(data){
                $("#dwgImage svg #"+id).remove();
                $("#dwgImage svg .selected").remove();
                $('.controlPoint').remove();
                if(data['auditDel']){
                    $('#auditTrail').DataTable().ajax.reload(auditTools, false);
                }
            }
        });
    }
}

function getBreakdownValues(parentSelector,checkDirty=false){
    /* Collects the breakdown values inside the parentSelector. Basically this must
       be a breakdown widget. The checkDirty is to see if any of the select values 
       have been manually changed by the user.
    */
    var refreshBreakdowns = false;
    var breakdowns = []
    parentSelector.find('select').each(function(i){
        var bucketType = $(this).attr('id');
        var selectedGuid = $(this).find(':selected').attr('id');
        if(selectedGuid == null){
            refreshBreakdowns = true;
        }
        if(checkDirty === true){
            if($(this).data('dirty') === true){
                breakdowns.push({'type': bucketType, 'guid':selectedGuid});    
            }
        }else{
            breakdowns.push({'type': bucketType, 'guid':selectedGuid});
        }
    });

    return [breakdowns,refreshBreakdowns]
}

function commitTakeoff(type, pageGuid, itemGuid, description, hotkey){
    $('#commitTakeoff').off();
    $('#commitTakeoff').click(function(e,ui){
        // we only need to do this if there is a running tool
        // for ex a tool can terminate in error, when the error due to attrs is fixed
        // we dont want to do this again
       
        if(global_AnnotList.length < 1){
            var qty = $('#takeoffQty').val();
            sendTakeoff(type, pageGuid,itemGuid,global_AnnotList,'',description,hotkey,qty);
        }else{
            // Trigger the mouse right click to have the tool finish itself
            $("#dwgImage").trigger({
                type: 'mouseup',
                button: 2
            });
        }
    }); 
}

function getTakeoffVarFields(){
    var inError = false;
    // error check the inputs
    // Store selected var values in a history obj
    attrib=[];
    $('.attr-field').each(function(idx,value){
        var varGuid = value.id;
        var varName = $(`label[for='${varGuid}']`).text();
        if($(value).is("select")){
            var type    = $(this).data('type')
            if(type === 'attribute'){
                var varValue = $(value).children(":selected").attr("id");
            }else if(type === 'decimal'){
                var varValue = $(value).children(":selected").val();
            }
            if(varValue){
                attrib.push({'varGuid':varGuid,'value':varValue});
                global_varHistory[varName] = varValue;
            }else{
                var existingError = $('#att').find('.alert-danger')
                if(existingError.length > 0){
                    existingError.fadeOut('slow',function(){
                        $('#att > .alert-danger').remove();
                        $('#att').prepend(`<div class='alert alert-danger'>Missing selections.</div>`);
                    });
                }else{
                    $('#att').prepend(`<div class='alert alert-danger'>Missing selections.</div>`);    
                }
                $(this).addClass('bg-warning');
                if(inError === false){
                    inError = true;
                }
            }
        }else{
            attrib.push({'varGuid':value.id,'value':$(value).val()});
            global_varHistory[varName] = $(value).val();
        }
    });
    return [attrib, inError]
}

function sendTakeoff(type, pageGuid, itemGuid, g, text='', description='', hotkey=false, QTY=1){
    var [attrib, inError] = getTakeoffVarFields();

    // Add an audit trail and annotation
    if(inError === false){
        if(global_AnnotList.length > 1){
            global_AnnotList[global_AnnotList.length - 1].remove();
            global_AnnotList.pop();
        }
        [breakdowns, refreshBreakdowns] = getBreakdownValues($('#breakdownContent'));

        if (String(QTY).charAt(0) === "=" ){
            if (!(QTY.includes("[") && QTY.includes("]"))){
                QTY = math.evaluate(QTY.substring(1));
            }
        }

        QTY = Math.round(QTY*1000)/1000;

        // Grab the annotations if they exist
        // If we are in assembly takeoff, highlight them with a red border
        var annotsTmp = [];
        if($('#saveAssembly').length < 1){
            $.each(global_AnnotList,function(idx){
                annotsTmp.push(this.outerHTML);
            });
        } else {
            $.each(global_AnnotList,function(idx){
                if(this.tagName == 'rect'){
                    this.setAttributeNS(null,'stroke','red');
                    this.setAttributeNS(null,'stroke-width',3);
                }
                annotsTmp.push(this.outerHTML);
            });
        }

        // Reset the GUI events immediately so we can prevent duplicate takeoff but we need 
        // a copy of the global annost list before its reset for later usage
        var localAnnotsList = global_AnnotList
        resetGuiEvents('#dwgImage');
        $(document).off('mousemove');

        // blank the attribute area and load in the spinner
        $('#att').empty();
        $('#att').html('<center><h4><i class="fal fa-atom-alt fa-pulse fa-2x"></i></h4></center>');
        
        sendData={
            'type':        type,
            'description': description,
            'pageGuid':    pageGuid,
            'buckets':     breakdowns,
            'estGuid':     $('#estGuid').val(),
            'itemGuid':    itemGuid,
            'quantity':    QTY,
            'attrib':      attrib,
            'g':           annotsTmp,
            'text':        text,
        }
        // check if we are in assembly/typical mode or not
        if($('#saveAssembly').length < 1){
            $.ajax({
                url:`postAuditRow/`,
                method: 'POST',
                data: JSON.stringify(sendData),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function(data){
                    $.each(localAnnotsList,function(i){
                        this.setAttributeNS(null,"data-audit-guid",data['guid']);
                        this.setAttributeNS(null,'id',data['annotIdList'][i]); 
                    });
                    $('#att').empty();
                    $('#auditTrail').DataTable().ajax.reload(auditTools, false);
                    mapRowToAnnot($('#auditTrail').DataTable());
                    if(refreshBreakdowns === true){
                        getBreakdowns($('#breakdownContent'));
                    }
                    global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
                },
                error: function(jqXHR,status,errorThrown){
                    if(jqXHR.status != '500'){
                        var msg = jqXHR.responseJSON['msg']
                        var existingError = $('#att').find('.alert-danger')
                        if(existingError.length > 0){
                            existingError.fadeOut('slow',function(){
                                $(this).remove();
                                $('#att').prepend(`<div class='alert alert-danger'>${msg}</div>`)
                            });
                        }else{
                            $('#att').prepend(`<div class='alert alert-danger'>${msg}</div>`)
                        }
                        
                    }else{
                        $('#att').find('.alert-danger').fadeOut('slow',function(){
                            $(this).remove();
                        });
                        $('#att').prepend(`<div class='alert alert-danger'>An error has occured on the server while submitting this takeoff, please send us a message using the help form in the top right as soon as possible.</div>`)
                    }
                }
            });
        } else {
            assemblyGuid = $('#saveAssembly').data('guid');
            sendData['assemblyGuid'] = assemblyGuid
            $.ajax({
                url: `addToEstAssembly/`,
                method: 'POST',
                data: JSON.stringify(sendData),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function(data){
                    $.each(localAnnotsList,function(i){
                        this.setAttributeNS(null,"data-audit-guid",data['guid']);
                        this.setAttributeNS(null,'id',data['annotIdList'][i]);
                    });
                    $('#att').empty();
                    getAssemblyItemTableTakeoff(assemblyGuid, true,['edit']);
                    global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
                }
            })
        }
    }else{
        return false
    }

}

function rapidCount(itemGuid,type,color){
    $('#dwgImage').css('cursor','crosshair');    
    $('#dwgImage').on('mousedown',function(e,ui){
        if(global_toolActive != true){
            global_toolActive = true;
            var svg = $('#dwgImage svg');
            svg.off();

            $(this).on('contextmenu',function(e){
                e.preventDefault();
                return(false);
            });
            // remove the dwgImage mouse event handler (inits again later)
            $('#dwgImage').off('mousedown');
            // remove the body mouse-up init
            $('body').off('mouseup');

            var svg = $('#dwgImage svg g')[0];
            var CMT = svg.getScreenCTM();
            var defaultW = 40;
            var defaultH = 30;
            var defaultRx= 10;
            var relX=(e.clientX-CMT.e)/CMT.a;
            var relY=(e.clientY-CMT.f)/CMT.d;
            var rect = document.createElementNS("http://www.w3.org/2000/svg",'rect');
            rect.setAttributeNS(null,'x',relX);
            rect.setAttributeNS(null,'y',relY);
            rect.setAttributeNS(null,'width',defaultW); // set a default width lower down the user selects the correct
            rect.setAttributeNS(null,'height',defaultH); // set a default height to make it easier to fix if there is an issue
            rect.setAttributeNS(null,'rx',defaultRx); // set the default border rad this is re-calc'ed when the width is set

            rect.setAttributeNS(null,'stroke','black');
            rect.setAttributeNS(null,'fill','red');
            rect.setAttributeNS(null,'stroke-width',3);
            rect.setAttributeNS(null,'fill-opacity',0.3);

            svg.appendChild(rect);

            $('#cancelTakeoff').off();
            $('#cancelTakeoff').click(function(e,ui){
                $(rect).fadeOut('normal',function(){
                    $(rect).remove();
                });
                $('#att').empty();
                resetGuiEvents("#dwgImage");
                global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
            });

            $(this).mousemove(function(e){
                w=((e.clientX-CMT.e)/CMT.a)-relX;
                h=((e.clientY-CMT.f)/CMT.d)-relY;
                if(w<0){
                    rect.setAttributeNS(null,'x',relX+w);
                    w=-w;
                }
                if(h<0){
                    rect.setAttributeNS(null,'y',relY+h);
                    h=-h;
                }
                rect.setAttributeNS(null,'width',w);
                rect.setAttributeNS(null,'height',h)
            });

            $(this).on('mouseup',function(e,ui){
                $(this).off('mousemove');
                global_toolActive = false;
                resetGuiEvents("#dwgImage");
                
                $('#commitTakeoff').off();
                $('#commitTakeoff').click(function(e,ui){
                    var pageGuid=$("#pageGuid").val();
                    var x = rect.getAttributeNS(null,'x');
                    var y = rect.getAttributeNS(null,'y');
                    var w = rect.getAttributeNS(null,'width');
                    var h = rect.getAttributeNS(null,'height');

                    [breakdowns, refreshBreakdowns] = getBreakdownValues($('#breakdownContent'));
                    var [attrib, inError] = getTakeoffVarFields();
                    var rmvDuplicates = $('#rapidCountRplcDuplicates').is(':checked');
                    
                    if(inError == false){
                        if(color == null){
                            color = "#2be28e";
                        }
                        sendData = {
                            type: type,
                            itemGuid: itemGuid,
                            color: color,
                            x: x,
                            y: y,
                            w: w,
                            h: h,
                            sourceGuid: pageGuid,
                            buckets: breakdowns,
                            attrib: attrib,
                            rmvDuplicates: rmvDuplicates,
                        }
                        $.ajax({
                            url: `rapidCount/`,
                            method: "POST",
                            data: JSON.stringify(sendData),
                            success: function(data){
                                console.log(data);
                                $('#att').empty();
                                global_AnnotList = [];
                                resetGuiEvents("#dwgImage");
                                global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
                                $('#aiStatus').empty().append("<p class='m-1'>Rapid count sent</p>");
                                var interval = setInterval(function(){
                                    updateAIStatus(data['qGuid'], interval);
                                },1000);
                            }
                        });
                    }
                });
            });
        }else{
            alert("A tool is already in use, please complete or cancel that one first before using Rapid Count.");
        }
    });
}

function scaleWarn(scaleRatio){
    var scaleSet = true;
    if(isNaN(scaleRatio)){
        scaleSet = false;
        $('#att').find('.alert-danger').fadeOut('slow',function(){
            $(this).remove();
        });
        $('#att').prepend("<div class='alert alert-danger'>No scale set, enter quantity manually.</div>");
    }
    return scaleSet
}

function toolPan(e, box,pan_init_x,pan_init_y,pan_box_x,pan_box_y){
    var newBox=[pan_box_x + (pan_init_x - e.clientX), pan_box_y + (pan_init_y - e.clientY), box.width, box.height];
    $('#dwgImage svg')[0].setAttribute('viewBox',newBox.join(" "));
}

function filterNextField(itemGuid, fieldSelections, nextFieldId, type, thisFieldId){
    var sendData={
        'currentSelections': fieldSelections,
        'nextFieldId': nextFieldId,
        'type': type,
    }

    $.post(
        `getItemVarFilteredValues/${itemGuid}/`,
        JSON.stringify(sendData),
        function(data){
            if('values' in data){
                varName = $(`label[for='${nextFieldId}']`).text();
                if(varName in global_varHistory){
                    histId = global_varHistory[varName];
                }else{
                    histId = null;
                }                
                if(data['values'].length > 1){
                    var optionsList = ["<option>Select</option>"]
                    $.each(data['values'],function(i){
                        opt = `<option id='${this['guid']}'>${this['val']}</option>`
                        if(histId){
                            // console.log(`${histId} - ${this['guid']}`);
                            if(histId == this['guid']){
                                opt = `<option id='${this['guid']}' selected>${this['val']}</option>`
                            }
                        }
                        optionsList.push(opt);
                    });
                    $(`#${nextFieldId}`).html(optionsList.join("\n"));
                    $(`#${nextFieldId}`).attr('disabled',false);
                }else{
                    if(data['values'].length > 0){
                        $(`#${nextFieldId}`).val(data['values'][0]['val']);
                        $(`#${nextFieldId}`).trigger('change');
                        if(data['values'].length < 2){
                            $(`#${nextFieldId}`).attr('disabled','disabled');    
                        }
                    }else{
                        $(`#${nextFieldId}`).attr('disabled',false);
                    }
                }
                
                // console.log(thisFieldId)
                // varName = $(`label[for='${thisFieldId}']`).text()
                // if($(`#${thisFieldId}`).is("select")){
                //     $(`#${thisFieldId}`).find(`#${global_varHistory[varName]}`).attr('selected','selected');
                // }else{
                //     $(`#${thisFieldId}`).val(global_varHistory[varName]);
                // }
            }
        }
    );
}

function initRotateSvgObj(svgObj){
    $(document).off('keydown');
    $(document).on('keydown', function(e){
        if(e.keyCode == 82) {
            groupBB = svgObj.getBBox();
            var rotateConst = 30;
            var transform = svgObj.getAttributeNS(null, 'transform');
            if(transform === null){
                transform = '';
            }
            var rotation = rotateConst;
            const re = /(rotate\([-0-9,. ]+\))/g;
            if(transform.search(re) > 0){
                const reRotation = /([-0-9.]\d*)/g;
                rotation = transform.match(re)[0].match(reRotation)[0];
                if(rotation <= 330){
                    rotation = parseInt(rotation)+rotateConst
                }else{
                    rotation = 0;
                }
                transform = transform.replace(re,`rotate(${rotation}, ${groupBB.x}, ${groupBB.y})`);
            }else{
                transform += ` rotate(${rotation}, ${groupBB.x}, ${groupBB.y})`;
            }
            svgObj.setAttributeNS(null,'transform',transform);
        }
    });
}

function selectCount(type,itemGuid=null,color=null,tool='mRect',description='',hotkey=false, hasAtt=false,lineWidth=20,button=null){
    if(global_toolActive != true){
        $('#dwgImage').off('contextmenu'); // stop the context menue durring tool usage.
        global_toolActive = true;
        var svg = $('#dwgImage svg').off();
        var svg = $('#dwgImage svg g')[0];
        var CMT = svg.getScreenCTM();

        var pageGuid=$("#pageGuid").val();
        // set a default color if it comes in as None
        if(color == 'None'){
            color = 'green';
        }
        // set the default tool explicity if its accidentally initialized to None
        if(tool == 'None'){
            tool = 'mRect'
        }

        // if we have "Use Symbols" selected, get the image and check if it is embeded in 
        // the svg file "style" as a background class. If it is apply that class to the
        // rectangle we draw, otherwise embed it in the svg first
        symbolImgEl = [];
        if(button !== null){
            var useThisSymbol = $(button).data('usesymbol');
            var drawSize = $(button).data('drawsize');
            // Here we lock in the symbol size for the drawing based on the pad settings. 
            var symbolSize = {}
            if(drawSize === 'symbolSmall'){
                symbolSize['w'] = 48;
                symbolSize['h'] = 48;
            }else if(drawSize === 'symbolMedium'){
                symbolSize['w'] = 96;
                symbolSize['h'] = 96;
            }else if(drawSize === 'symbolLarge'){
                symbolSize['w'] = 144;
                symbolSize['h'] = 144;
            }
            if(useThisSymbol === true){
                var symbolImgEl = $(button).find('img');
                if(symbolImgEl.length > 0){
                    var symbolImgHref = symbolImgEl.attr('src');
                    var symbolImgGuid = symbolImgHref.split('/')
                    symbolImgGuid = symbolImgGuid[symbolImgGuid.length - 1];
                    
                    var symbolImgBase64 = getBase64Image(symbolImgEl[0]);

                    var defs = $('#dwgImage svg defs')[0];
                    var extCheck = $(defs).find(`#symbol_${symbolImgGuid}`)
                    if(extCheck.length < 1){
                        var img = document.createElementNS("http://www.w3.org/2000/svg",'image');
                        img.setAttributeNS(null,'id',`symbol_${symbolImgGuid}`);
                        img.setAttributeNS(null,'href',`data:image/png;base64,${symbolImgBase64}`);
                        img.setAttributeNS(null,'x',0);
                        img.setAttributeNS(null,'y',0);
                        img.setAttributeNS(null,'width',symbolSize['w']);
                        img.setAttributeNS(null,'height',symbolSize['h']);
                        var pageGuid=$("#pageGuid").val();
                        $.ajax({
                            url: `addDefs/${pageGuid}/`,
                            method: 'POST',
                            data: {
                                guid: symbolImgGuid,
                                defEl: img.outerHTML
                            },
                            success: function(data){
                                defs.appendChild(img);
                            }
                        });
                    }else{
                        // as the icons are always square we just need to check width
                        img = extCheck[0];
                        width = img.getAttributeNS(null,'width')
                        if(width != symbolSize['w']){
                            img.setAttributeNS(null,'width',symbolSize['w']);
                            img.setAttributeNS(null,'height',symbolSize['h']);
                            var pageGuid=$("#pageGuid").val();
                            $.ajax({
                                url: `addDefs/${pageGuid}/`,
                                method: 'POST',
                                data: {
                                    guid: symbolImgGuid,
                                    defEl: img.outerHTML
                                },
                                success: function(data){
                                }
                            });
                        }
                    }
                }else{
                    console.log("WARNING: no image for button found.")
                }
            }
        }

        // add the symbol to the mouse to follow it arround for the initial placement
        if(symbolImgEl.length > 0){
            var relX = 0;
            var relY = 0;
            // rect.setAttributeNS(null,'class',`c_${symbolImgGuid}`);
            var useImg = document.createElementNS("http://www.w3.org/2000/svg",'use');
            useImg.setAttributeNS(null,'href',`#symbol_${symbolImgGuid}`);
            useImg.setAttributeNS(null,'x',relX);
            useImg.setAttributeNS(null,'y',relY);
            svg.appendChild(useImg);
            global_AnnotList.push(useImg)

            imgBB = useImg.getBBox();
            initRotateSvgObj(useImg);
            $(document).off('mousemove');
            $(document).mousemove(function(e){
                var relX=(e.clientX-CMT.e)/CMT.a - imgBB.x;
                var relY=(e.clientY-CMT.f)/CMT.d - imgBB.y;
                const re = /(translate\([-0-9,. ]+\))/g;
                var trans = global_AnnotList[global_AnnotList.length - 1].getAttributeNS(null,'transform');
                if(trans){
                    trans = trans.replace(re,`translate(${relX}, ${relY})`);
                }else{
                    trans = `translate(${relX}, ${relY})`;
                }
                global_AnnotList[global_AnnotList.length - 1].setAttributeNS(null,'transform',trans);
            });
        }

        var annotList = []
        if (hasAtt){
            $.ajax({
                url: `getItemDetails/${itemGuid}/?type=${type}`,
                method: "GET",
                success: function(data){
                    $('#att').html(data);
                    $('#rapidCountRplDuplicatesContainer').hide();
                    var fieldOrderedList = []
                    var fieldSelections = {}

                    $('#rapidCount').off();
                    $('#rapidCount').click(function(e){
                        // Reset everything and start rapid count process, we dont 
                        // use a tool for this feature                        
                        resetGuiEvents("#dwgImage");
                        global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
                        $('#takeoffQty').attr('disabled','disabled');
                        $('#takeQtyContainer').addClass('alert alert-success');
                        $('#rapidCountRplDuplicatesContainer').fadeIn('normal');
                        
                        var showTutorial = $('#dSATutorialRapidCount').is(':checked');
                        if(showTutorial === false){
                            $('#tutorialRapidCountModal').modal('show');
                            $('#tutorialRapidCountModal').off();
                            $('#tutorialRapidCountModal').on('hide.bs.modal',function(){
                                rapidCount(itemGuid, type, color);
                            });
                            $('#dSATutorialRapidCount').change(function(e,ui){
                                var dsa = $('#dSATutorialRapidCount').is(':checked');
                                if(dsa === false){
                                    dsa = ''
                                }else{
                                    dsa = 'checked'
                                }
                                $.ajax({
                                    url: `/est/settings/saveKV/`,
                                    method: 'POST',
                                    data: JSON.stringify({ dSATutorialRapidCount: dsa, }),
                                    success: function(data){

                                    }
                                });
                            });
                        }else{
                            rapidCount(itemGuid, type, color);
                        }
                    });

                    // Build the field ordered list first
                    $('.attr-field').each(function(i){
                        fieldId = $(this).attr('id');
                        fieldOrderedList.push(fieldId);
                    });

                    // crawl through all the fields and set their filtered values and history settings
                    $('.attr-field').each(function(i){      
                        fieldId = $(this).attr('id');                  
                        varName = $(`label[for='${fieldId}']`).text()
                        if(varName in global_varHistory){
                            if($(this).is("select")){
                                $(this).find(`#${global_varHistory[varName]}`).attr('selected','selected');
                                selectedId = global_varHistory[varName]
                            }else{
                                $(this).val(global_varHistory[varName]);
                                selectedId = null;
                            }
                            
                            thisFieldId = $(this).attr('id');
                            var varDisplayPos = parseInt($(this).data('display-pos'));
                            
                            nextFieldId = fieldOrderedList[fieldOrderedList.indexOf(thisFieldId)+1];

                            if(varDisplayPos != $('.attr-field').length - 1){
                                if(thisFieldId in fieldSelections){
                                    $('.attr-field').each(function(i){
                                        var thisDisplayPos = parseInt($(this).data('display-pos'));
                                        if(thisDisplayPos > varDisplayPos){
                                            $(this).attr('disabled','disabled');
                                            delete fieldSelections[$(this).attr('id')];
                                        }
                                    });
                                }
                                fieldSelections[thisFieldId] = selectedId;
                            }

                            filterNextField(itemGuid, fieldSelections,nextFieldId,type, thisFieldId);
                            $(this).attr('disabled',false);
                        }
                    });

                    // setup some events
                    $('.attr-field').off();
                    $('.attr-field').change(function(e,ui){
                        thisFieldId = $(this).attr('id');
                        selectedId = $(this).find('option:selected').attr('id');
                        var varDisplayPos = parseInt($(this).data('display-pos'));
                        if(varDisplayPos != $('.attr-field').length - 1){
                            if(thisFieldId in fieldSelections){
                                $('.attr-field').each(function(i){
                                    var thisDisplayPos = parseInt($(this).data('display-pos'));
                                    if(thisDisplayPos > varDisplayPos){
                                        $(this).attr('disabled','disabled');
                                        delete fieldSelections[$(this).attr('id')];
                                    }
                                });
                            }
                            fieldSelections[thisFieldId] = selectedId;
                        }
                        nextFieldId = fieldOrderedList[fieldOrderedList.indexOf(thisFieldId)+1];

                        filterNextField(itemGuid, fieldSelections,nextFieldId,type);
                        
                    });

                    commitTakeoff(type,pageGuid,itemGuid,description,hotkey)
                    // Cancel the takeoff
                    $('#cancelTakeoff').click(function(e,ui){
                        $.each(global_AnnotList,function(i){
                            $(this).fadeOut('normal',function(){
                                $(this).remove();
                            });
                        })
                        global_AnnotList = [];
                        $('#att').empty();
                        resetGuiEvents("#dwgImage");
                        global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
                    });
                },
                error: function(jqXHR,status,errorThrown){
                    $('#att').prepend(`<div class='alert alert-danger'>An error has occured while trying to get item details, please send us a message using the help form in the top right as soon as possible.</div>`);
                }
            });
        }
        $(document).on('keyup', function(e) {
            if (e.key == "Escape"  && global_toolActive === true){
                $.each(global_AnnotList,function(i){
                    $(this).fadeOut('normal',function(){
                        $(this).remove();
                    });
                })
                $(document).off('mousemove');
                $('#att').empty();
                global_AnnotList = [];
                resetGuiEvents("#dwgImage");
                global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
            }
        });

        $('#dwgImage').css('cursor','crosshair');
        $('#dwgImage').on('mousedown',function(e,ui){
            if(e.button!=1){ // middle button
                var scaleRatio = parseFloat($('#dwgImage').data('scale-ratio'));

                var PANNING = false;
                var pan_box = null;
                var pan_box_x = null;
                var pan_box_y = null;
                var pan_init_x= null;
                var pan_init_y= null;

                if(tool == 'mRect' || tool == 'square'){
                    // disable context menue as we want the right click to be our own
                    $(this).on('contextmenu',function(e){
                        e.preventDefault();
                        return(false);
                    });
                    // remove the dwgImage mouse event handler (inits again later)
                    $('#dwgImage').off('mousedown');
                    // remove the body mouse-up init
                    $('body').off('mouseup');

                    var relX=(e.clientX-CMT.e)/CMT.a;
                    var relY=(e.clientY-CMT.f)/CMT.d;
                    var rect = document.createElementNS("http://www.w3.org/2000/svg",'rect');
                    rect.setAttributeNS(null,'x',relX);
                    rect.setAttributeNS(null,'y',relY);
                    if(color != null){
                        rect.setAttributeNS(null,'stroke',color);
                        rect.setAttributeNS(null,'stroke-width',2);
                        rect.setAttributeNS(null,'fill',color);
                        rect.setAttributeNS(null,'fill-opacity',0.3);
                    }else{
                        rect.setAttributeNS(null,'stroke','green');
                        rect.setAttributeNS(null,'stroke-width',1);
                        rect.setAttributeNS(null,'fill','green');
                        rect.setAttributeNS(null,'fill-opacity',0.1);
                    }
                    rect.setAttributeNS(null,'width',50);
                    rect.setAttributeNS(null,'height',50);
                    
                    if(symbolImgEl.length > 0){
                        // rect.setAttributeNS(null,'class',`c_${symbolImgGuid}`);
                        // var useImg = document.createElementNS("http://www.w3.org/2000/svg",'use');
                        // useImg.setAttributeNS(null,'href',`#symbol_${symbolImgGuid}`);
                        // useImg.setAttributeNS(null,'x',relX);
                        // useImg.setAttributeNS(null,'y',relY);
                        // svg.appendChild(useImg);
                        rect = $(useImg).clone()[0];
                        useImg.remove();
                    }else{
                        $(this).mousemove(function(e){
                            w=((e.clientX-CMT.e)/CMT.a)-relX;
                            h=((e.clientY-CMT.f)/CMT.d)-relY;
                            if(w<0){
                                rect.setAttributeNS(null,'x',relX+w);
                                w=-w;
                            }
                            if(h<0){
                                rect.setAttributeNS(null,'y',relY+h);
                                h=-h;
                            }
                            rect.setAttributeNS(null,'width',w);
                            rect.setAttributeNS(null,'height',h);
                        });
                    }
                    
                    svg.appendChild(rect);

                    var qtyTotal = 0;
                    global_AnnotList = [rect,];

                    // EVENTS
                    $('#dwgImage').on('mousedown',function(e){
                        if(e.button == 1){ // aka middle button
                            PANNING = true;
                            pan_box = $('#dwgImage svg')[0].viewBox.baseVal;
                            pan_box_x = $('#dwgImage svg')[0].viewBox.baseVal.x;
                            pan_box_y = $('#dwgImage svg')[0].viewBox.baseVal.y;
                            pan_init_x = e.clientX;
                            pan_init_y = e.clientY;
                        }
                    });
                    
                    $(this).on('mouseup',function(e,ui){
                        if(e.button == 0){ // left mouse button
                            relX=(e.clientX-CMT.e)/CMT.a;
                            relY=(e.clientY-CMT.f)/CMT.d;

                            rect = $(rect).clone()[0]; // clone the rectangle using jQuery then get the node
                            svg.appendChild(rect);
                            initRotateSvgObj(rect);
                            imgBB = rect.getBBox();

                            // annotList.push(rectNext);
                            // global_AnnotList = annotList;
                            global_AnnotList.push(rect)

                            qtyTotal += 1;
                            $('#takeoffQty').val(qtyTotal);
                            $(this).off('mousemove');
                            $('#dwgImage').mousemove(function(e){
                                if(PANNING === true){
                                    CMT = svg.getScreenCTM();
                                    toolPan(e,pan_box,pan_init_x,pan_init_y,pan_box_x,pan_box_y);
                                }
                                // var relX=(e.clientX-CMT.e)/CMT.a;
                                // var relY=(e.clientY-CMT.f)/CMT.d;
                                // global_AnnotList[global_AnnotList.length - 1].setAttributeNS(null,'x',relX);
                                // global_AnnotList[global_AnnotList.length - 1].setAttributeNS(null,'y',relY);
                                var relX=(e.clientX-CMT.e)/CMT.a - imgBB.x;
                                var relY=(e.clientY-CMT.f)/CMT.d - imgBB.y;
                                const re = /(translate\([-0-9,. ]+\))/g;
                                var trans = global_AnnotList[global_AnnotList.length - 1].getAttributeNS(null,'transform');
                                if(trans){
                                    trans = trans.replace(re,`translate(${relX}, ${relY})`);
                                }else{
                                    trans = `translate(${relX}, ${relY})`;
                                }
                                global_AnnotList[global_AnnotList.length - 1].setAttributeNS(null,'transform',trans);
                            });

                        }else if (e.button == 1){ // middle mouse button
                            PANNING = false;
                            pan_init_x = null;
                            pan_init_y = null;
                        }else if (e.button == 2){ // right mouse button
                            // global_AnnotList[global_AnnotList.length - 1].remove(); // this last rect is the hover and is discarded
                            // global_AnnotList.pop(); // dump the last value as its the last circle that was being tracked
                            var qty = $('#takeoffQty').val();
                            sendTakeoff(type,pageGuid,itemGuid,global_AnnotList,'',description,hotkey, qty);
                        }
                    });
                }else if(tool == 'polygon'){

                    scaleSet = scaleWarn(scaleRatio);
                    function calcPolygonArea(vertices) {
                        // source: https://stackoverflow.com/questions/16285134/calculating-polygon-area
                        var total = 0;
                    
                        for (var i = 0, l = vertices.length; i < l; i++) {
                          var addX = vertices[i].x;
                          var addY = vertices[i == vertices.length - 1 ? 0 : i + 1].y;
                          var subX = vertices[i == vertices.length - 1 ? 0 : i + 1].x;
                          var subY = vertices[i].y;
                    
                          total += (addX * addY * 0.5);
                          total -= (subX * subY * 0.5);
                        }
                    
                        return Math.abs(total);
                    }

                    function polySetQty(virts){
                        if(scaleSet){
                            var area   = calcPolygonArea(virts);
                            console.log(area);
                            // console.log(area);
                            // var areaMm = Math.round(area/Math.pow(mmScaleFactor,2)*100)/100;
                            // var areaIn = area / 419904;
                            var areaFt = area / areaSqFtFactor;
                            var areaMm = areaFt * 92903;
                            var curVal = $('#takeoffQty').val();
                            if($('#takeoffQty').data('dirty') != true){
                                if(curVal.charAt(0) !== '='){
                                    if(som === "IMP"){
                                        // $('#takeoffQty').val(Math.round(scaleRatio * areaIn *100)/100);
                                        $('#takeoffQty').val(Math.round(scaleRatio * scaleRatio * areaFt *1000)/1000);
                                    }else{
                                        $('#takeoffQty').val(Math.round(scaleRatio * scaleRatio * areaMm *1000)/1000);
                                    }
                                }
                            }
                        }
                    }
                    // disable context menue as we want to use right click
                    // to terminate the tool
                    $(this).on('contextmenu',function(e){
                        e.preventDefault();
                        return(false);
                    });
                    // remove the dwgImage mouse event handler (inits again later)
                    $('#dwgImage').off('mousedown');
                    // remove the body mouse-up init
                    $('body').off('mouseup');

                    var relX=(e.clientX-CMT.e)/CMT.a;
                    var relY=(e.clientY-CMT.f)/CMT.d;
                    var poly = document.createElementNS("http://www.w3.org/2000/svg",'polygon');
                    if(color != null){
                        poly.setAttributeNS(null,'stroke',color);
                        poly.setAttributeNS(null,'fill',color);
                        poly.setAttributeNS(null,'stroke-width',2);
                        poly.setAttributeNS(null,'fill-opacity',0.3);
                    }else{
                        poly.setAttributeNS(null,'stroke','green');
                        poly.setAttributeNS(null,'fill','green');
                        poly.setAttributeNS(null,'stroke-width',1);
                        poly.setAttributeNS(null,'fill-opacity',0.1);
                    }
                    poly.setAttributeNS(null,"points",`${Math.floor(relX)} ${Math.floor(relY)}`);
                    svg.appendChild(poly);
                    global_AnnotList.push(poly);

                    // set the mouse movement handler, this draws the "live action" part of the polygon
                    $(this).mousemove(function(e){
                        nextX=((e.clientX-CMT.e)/CMT.a);
                        nextY=((e.clientY-CMT.f)/CMT.d);
                        var curPoints = poly.getAttributeNS(null,'points').split(',');
                        if(curPoints.length < 2){
                            poly.setAttributeNS(null,"points",`${curPoints.join(',')},${Math.floor(nextX)} ${Math.floor(nextY)}`);
                        }else{
                            var virts = [];
                            $.each(curPoints,function(i){
                                // console.log(this.split(" "));
                                var x = this.split(" ")[0]
                                var y = this.split(" ")[1]
                                virts.push({
                                    x: x,
                                    y: y
                                });
                            });
                            polySetQty(virts);
                            curPoints.pop() // drop last value in points array
                            poly.setAttributeNS(null,"points",`${curPoints.join(',')},${Math.floor(nextX)} ${Math.floor(nextY)}`);
                        }
                    });
                    // setup a handler to handle mouse clicks while performing polygon, left click
                    // will add a point to the polygong, right click will exit it
                    $(this).on('mouseup',function(e,ui){
                        
                        if(e.button == 0){ // left mouse button
                            nextX=((e.clientX-CMT.e)/CMT.a);
                            nextY=((e.clientY-CMT.f)/CMT.d);
                            var curPoints = poly.getAttributeNS(null,'points').split(',');
                            poly.setAttributeNS(null,"points",`${curPoints.join(',')},${Math.floor(nextX)} ${Math.floor(nextY)}`);
                        }else if(e.button == 1){ // middle mouse button

                        }else if (e.button == 2){ // right mouse button
                            nextX=((e.clientX-CMT.e)/CMT.a);
                            nextY=((e.clientY-CMT.f)/CMT.d);
                            var curPoints = poly.getAttributeNS(null,'points').split(',');
                            poly.setAttributeNS(null,"points",`${curPoints.join(',')},${Math.floor(nextX)} ${Math.floor(nextY)}`);
                            var virts = [];
                            $.each(curPoints,function(i){
                                // console.log(this.split(" "));
                                var x = this.split(" ")[0]
                                var y = this.split(" ")[1]
                                virts.push({
                                    x: x,
                                    y: y
                                });
                            });
                            polySetQty(virts);
                            var QTY = $('#takeoffQty').val();
                            sendTakeoff(type, pageGuid, itemGuid, poly, '', description, hotkey , QTY);
                        }
                    });
                }else if(tool == 'mCountCircle'){
                    // disable context menue as we want the right click to be our own
                    $(this).on('contextmenu',function(e){
                        e.preventDefault();
                        return(false);
                    });
                    // remove the dwgImage mouse event handler (inits again later)
                    $('#dwgImage').off('mousedown');
                    // remove the body mouse-up init
                    $('body').off('mouseup');

                    var circle = document.createElementNS("http://www.w3.org/2000/svg",'circle');
                    var relX=(e.clientX-CMT.e)/CMT.a;
                    var relY=(e.clientY-CMT.f)/CMT.d;
                    circle.setAttributeNS(null,'cx',relX);
                    circle.setAttributeNS(null,'cy',relY);
                    if(color != null){
                        circle.setAttributeNS(null,'stroke',color);
                        circle.setAttributeNS(null,'fill',color);
                        circle.setAttributeNS(null,'stroke-width',2);
                        circle.setAttributeNS(null,'fill-opacity',0.3);
                    }else{
                        circle.setAttributeNS(null,'stroke','green');
                        circle.setAttributeNS(null,'fill','green');
                        circle.setAttributeNS(null,'stroke-width',1);
                        circle.setAttributeNS(null,'fill-opacity',0.1);
                    }
                    circle.setAttributeNS(null,'r',10); // set a default rad
                    svg.appendChild(circle);

                    var radius=10;
                    $(this).mousemove(function(e){
                        var a = relX - (e.clientX-CMT.e)/CMT.a;
                        var b = relY - (e.clientY-CMT.f)/CMT.d;

                        radius = Math.sqrt( a*a + b*b );
                        circle.setAttributeNS(null,'r',radius);
                    });
                    var qtyTotal = 0;
                    annotList = [circle,];
                    // EVENTS
                    $('#dwgImage').on('mousedown',function(e){
                        if(e.button == 1){ // aka middle button
                            PANNING = true;
                            pan_box = $('#dwgImage svg')[0].viewBox.baseVal;
                            pan_box_x = $('#dwgImage svg')[0].viewBox.baseVal.x;
                            pan_box_y = $('#dwgImage svg')[0].viewBox.baseVal.y;
                            pan_init_x = e.clientX;
                            pan_init_y = e.clientY;
                        }
                    });

                    $(this).on('mouseup',function(e, ui){
                        if(e.button == 0){ // left mouse button
                            // yes... i violated DRY here... I cant figure out a sane way
                            // to have JS copy one circle obj into another... and cpy + pst is faster!
                            relX=(e.clientX-CMT.e)/CMT.a;
                            relY=(e.clientY-CMT.f)/CMT.d;
                            var circleNext = document.createElementNS("http://www.w3.org/2000/svg",'circle');
                            circleNext.setAttributeNS(null,'cx',relX);
                            circleNext.setAttributeNS(null,'cy',relY);
                            if(color != null){
                                circleNext.setAttributeNS(null,'stroke',color);
                                circleNext.setAttributeNS(null,'fill',color);
                                circleNext.setAttributeNS(null,'stroke-width',2);
                                circleNext.setAttributeNS(null,'fill-opacity',0.3);
                            }else{
                                circleNext.setAttributeNS(null,'stroke','green');
                                circleNext.setAttributeNS(null,'fill','green');
                                circleNext.setAttributeNS(null,'stroke-width',1);
                                circleNext.setAttributeNS(null,'fill-opacity',0.1);
                            }
                            circleNext.setAttributeNS(null,'r',radius); // set a default rad
                            svg.appendChild(circleNext);
                            
                            annotList.push(circleNext);
                            global_AnnotList = annotList;

                            qtyTotal += 1;
                            $('#takeoffQty').val(qtyTotal);
                            $(this).off('mousemove');
                            $('#dwgImage').mousemove(function(e){
                                if(PANNING === true){
                                    CMT = svg.getScreenCTM();
                                    toolPan(e,pan_box,pan_init_x,pan_init_y,pan_box_x,pan_box_y);
                                }
                                var relX=(e.clientX-CMT.e)/CMT.a;
                                var relY=(e.clientY-CMT.f)/CMT.d;
                                circleNext.setAttributeNS(null,'cx',relX);
                                circleNext.setAttributeNS(null,'cy',relY);                            
                            });
                        }else if (e.button == 1){ // middle mouse button
                            PANNING = false;
                            pan_init_x = null;
                            pan_init_y = null;
                        }else if (e.button == 2){ // right mouse button
                            // $('circle:last').remove(); // this last circle is the hover and is discarded
                            // send the quantity of counts over
                            // annotList.pop(); // dump the last value as its the last circle that was being tracked
                            var qty = $('#takeoffQty').val();
                            sendTakeoff(type,pageGuid,itemGuid,annotList,'',description,hotkey, qty);
                            // resetGuiEvents(this);
                        }
                        
                    });
                }else if(tool == 'mRoundRect'){
                    // disable context menue as we want the right click to be our own
                    $(this).on('contextmenu',function(e){
                        e.preventDefault();
                        return(false);
                    });
                    // remove the dwgImage mouse event handler (inits again later)
                    $('#dwgImage').off('mousedown');
                    // remove the body mouse-up init
                    $('body').off('mouseup');

                    var defaultW = 40;
                    var defaultH = 30;
                    var defaultRx= 10;
                    var relX=(e.clientX-CMT.e)/CMT.a - defaultW/2;
                    var relY=(e.clientY-CMT.f)/CMT.d - defaultRx/2;
                    var transformOrgX = relX + (defaultW/2);
                    var transformOrgY = relY + (defaultRx/2);
                    var rect = document.createElementNS("http://www.w3.org/2000/svg",'rect');
                    rect.setAttributeNS(null,'x',relX);
                    rect.setAttributeNS(null,'y',relY);
                    rect.setAttributeNS(null,'width',defaultW); // set a default width lower down the user selects the correct
                    rect.setAttributeNS(null,'height',defaultH); // set a default height to make it easier to fix if there is an issue
                    rect.setAttributeNS(null,'rx',defaultRx); // set the default border rad this is re-calc'ed when the width is set

                    // rect.setAttributeNS(null,'transform-origin',`${transformOrgX} ${transformOrgY}`)

                    if(color != null){
                        rect.setAttributeNS(null,'stroke',color);
                        rect.setAttributeNS(null,'fill',color);
                        rect.setAttributeNS(null,'stroke-width',2);
                        rect.setAttributeNS(null,'fill-opacity',0.3);
                    }else{
                        rect.setAttributeNS(null,'stroke','green');
                        rect.setAttributeNS(null,'fill','green');
                        rect.setAttributeNS(null,'stroke-width',1);
                        rect.setAttributeNS(null,'fill-opacity',0.1);
                    }
                    svg.appendChild(rect);

                    // So the al-gor-rithms here are most messed up
                    // We use switching in the event listeners, because
                    // it was not working to repeatedly reset them...
                    var length = true;
                    var lastX = 0;
                    var lastY = 0;
                    scaleSet = scaleWarn(scaleRatio);
                    
                    $(this).mousemove(function(e){
                        if(length){
                            // length
                            var relX2=((e.clientX-CMT.e)/CMT.a);
                            var relY2=((e.clientY-CMT.f)/CMT.d);
                            var a = relX - relX2;
                            var b = relY - relY2;
                            var h = Math.sqrt( a*a + b*b );
                            var angleDeg = Math.atan2(b, a) * 180 / Math.PI;
                            rect.setAttributeNS(null,'transform',`rotate(${angleDeg+90} ${transformOrgX} ${transformOrgY})`);
                            rect.setAttributeNS(null,'height',h);
                            if (scaleSet){
                                var lineLength = rect.getTotalLength();
                                var lineLengthmm = Math.round(lineLength/mmScaleFactor*100)/100;
                                var lineLengthinch = Math.round(lineLength/inScaleFactor*100)/100;
                                var lineLengthft = Math.round(lineLengthinch/12*100)/100;
                                if(som === "IMP"){
                                    $('#takeoffQty').val(Math.round(scaleRatio * lineLengthft *100)/100);
                                }else{
                                    $('#takeoffQty').val(Math.round(scaleRatio * lineLengthmm *100)/100);
                                }
                            }else{
                                global_AnnotList.push(rect);
                            }
                        }else{
                            // moving to set the width of the line
                            var relX3=((e.clientX-CMT.e)/CMT.a);
                            var relY3=((e.clientY-CMT.f)/CMT.d);
                            var a = lastX - relX3;
                            var b = lastY - relY3;
                            var w = Math.sqrt( a*a + b*b );
                            if (w < defaultW){
                                w=defaultW;
                            }
                            var xPrime = relX-w/2+defaultW/2; // we have to add in the offset from the transform-origin
                            rect.setAttributeNS(null,'width',w);
                            rect.setAttributeNS(null,'rx',w/2);
                            rect.setAttributeNS(null,'x',xPrime);
                        }
                    });
                    $(this).on('mouseup',function(e,ui){
                        if (length){
                            length = false;
                            lastX = ((e.clientX-CMT.e)/CMT.a);
                            lastY = ((e.clientY-CMT.f)/CMT.d);
                            
                            if (scaleSet){
                                var qty = $('#takeoffQty').val();
                                sendTakeoff(type, pageGuid,itemGuid,rect,'',description,hotkey,qty);
                            }
                        }
                    });
                }else if(tool == 'polyline'){
                    // disable context menu here to allow right click
                    // to terminate tool
                    $(this).on('contextmenu',function(e){
                        e.preventDefault();
                        return(false);
                    });
                    // remove the dwgImage mouse event handler (inits again later)
                    $('#dwgImage').off('mousedown');
                    // remove the body mouse-up init
                    $('body').off('mouseup');
                    var relX=(e.clientX-CMT.e)/CMT.a;
                    var relY=(e.clientY-CMT.f)/CMT.d;
                    var pl = document.createElementNS("http://www.w3.org/2000/svg",'polyline');
                    if(color != null){
                        pl.setAttributeNS(null,'stroke',color);
                        pl.setAttributeNS(null,'stroke-width',lineWidth);
                        pl.setAttributeNS(null,'stroke-linecap',"round");
                        pl.setAttributeNS(null,'opacity',0.5);
                        pl.setAttributeNS(null,'fill-opacity',0);                    
                    }else{
                        pl.setAttributeNS(null,'stroke','green');
                        pl.setAttributeNS(null,'stroke-width',lineWidth);
                        pl.setAttributeNS(null,'stroke-linecap',"round");
                        pl.setAttributeNS(null,'opacity',0.5);
                        pl.setAttributeNS(null,'fill-opacity',0);
                    }
                    pl.setAttributeNS(null,"points",`${Math.floor(relX)} ${Math.floor(relY)}`);
                    global_AnnotList.push(pl);

                    svg.appendChild(pl);

                    scaleSet = scaleWarn(scaleRatio);
                    som = $("#som").val();

                    // EVENTS
                    $('#dwgImage').on('mousedown',function(e){
                        if(e.button == 1){ // aka middle button
                            PANNING = true;
                            pan_box = $('#dwgImage svg')[0].viewBox.baseVal;
                            pan_box_x = $('#dwgImage svg')[0].viewBox.baseVal.x;
                            pan_box_y = $('#dwgImage svg')[0].viewBox.baseVal.y;
                            pan_init_x = e.clientX;
                            pan_init_y = e.clientY;
                        }
                    });

                    $('#takeoffQty').off();
                    $('#takeoffQty').on('keyup',function(e){
                        $('#takeoffQty').data('dirty',true);
                        $('#takeoffQty').addClass('bg-info');
                    });

                    function polySetQty(){
                        if(scaleSet){
                            var lineLength = pl.getTotalLength();
                            var lineLengthmm = Math.round(lineLength/mmScaleFactor*100)/100;
                            var lineLengthinch = Math.round(lineLength/inScaleFactor*100)/100;
                            var lineLengthft = Math.round(lineLengthinch/12*100)/100;
                            var curVal = $('#takeoffQty').val();
                            if($('#takeoffQty').data('dirty') != true){
                                if(curVal.charAt(0) !== '='){
                                    if(som === "IMP"){
                                        $('#takeoffQty').val(Math.round(scaleRatio * lineLengthft *100)/100);
                                    }else{
                                        $('#takeoffQty').val(Math.round(scaleRatio * lineLengthmm *100)/100);
                                    }
                                }
                            }
                        }
                    }
                    // set the mouse movement handler, this draws the "live" end of the polyline
                    $(this).mousemove(function(e){
                        if(PANNING === true){
                            CMT = svg.getScreenCTM();
                            toolPan(e,pan_box,pan_init_x,pan_init_y,pan_box_x,pan_box_y);
                        }
                        nextX=((e.clientX-CMT.e)/CMT.a);
                        nextY=((e.clientY-CMT.f)/CMT.d);
                        var curPoints = pl.getAttributeNS(null,'points').split(',');
                        if(curPoints.length < 2){
                            pl.setAttributeNS(null,"points",`${curPoints.join(', ')}, ${Math.floor(nextX)} ${Math.floor(nextY)}`);
                        }else{
                            curPoints.pop() // drop last value in points array
                            pl.setAttributeNS(null,"points",`${curPoints.join(', ')}, ${Math.floor(nextX)} ${Math.floor(nextY)}`);   
                        }

                        polySetQty();
                    });

                    var attemptingSendTakeoff = false;

                    // setup a handler to handle mouse clicks while performing polygon, left click
                    // will add a point to the polyline, right click will exit it
                    $(this).on('mouseup',function(e,ui){
                        if(e.button == 0){ // left mouse button
                            nextX=((e.clientX-CMT.e)/CMT.a);
                            nextY=((e.clientY-CMT.f)/CMT.d);
                            var curPoints = pl.getAttributeNS(null,'points').split(',');
                            pl.setAttributeNS(null,"points",`${curPoints.join(', ')}, ${Math.floor(nextX)} ${Math.floor(nextY)}`);
                            if (scaleSet){
                                var lineLength = pl.getTotalLength();
                                var lineLengthmm = Math.round(lineLength/mmScaleFactor*100)/100;
                                var lineLengthinch = Math.round(lineLength/inScaleFactor*100)/100;
                                var lineLengthft = Math.round(lineLengthinch/12*100)/100;
                                if(som === "IMP"){
                                    $('#takeoffQty').val(Math.round(scaleRatio * lineLengthft *100)/100);
                                }else{
                                    $('#takeoffQty').val(Math.round(scaleRatio * lineLengthmm *100)/100);
                                }
                            }
                        }else if(e.button == 1){ // middle mouse button
                            PANNING = false;
                            pan_init_x = null;
                            pan_init_y = null;
                        }else if (e.button == 2){ // right mouse button ends the tool
                            $(this).off('mousemove');
                            var curPoints = pl.getAttributeNS(null,'points').split(',');
                            curPoints.pop();
                            closurePoints = curPoints.slice(); // copy the points
                            closurePoints.pop(); // drop the last item as we dont have to mirror it
                            closurePoints.reverse();
                            
                            if(curPoints.length > 1){
                                if(attemptingSendTakeoff === false){
                                    // Set the final clicked points to get the final length of the poly line 
                                    // before we reverse mirror it (to fix select issues)
                                    pl.setAttributeNS(null,"points",`${curPoints.join(', ')}`);
                                    polySetQty();
                                    curPoints = curPoints.concat(closurePoints);
                                    // pl.setAttributeNS(null,"points",`${curPoints.join(', ')}, ${Math.floor(nextX)} ${Math.floor(nextY)}`);
                                    pl.setAttributeNS(null,"points",`${curPoints.join(', ')}`);
                                }
                                
                                attemptingSendTakeoff = true;
                                if (scaleSet){
                                    var qty = $('#takeoffQty').val();
                                    sendTakeoff(type, pageGuid,itemGuid,pl,'',description,hotkey,qty);
                                }else{
                                    var qty = $('#takeoffQty').val();
                                    if(qty != 0){
                                        sendTakeoff(type, pageGuid,itemGuid,pl,'',description,hotkey,qty);
                                    }
                                    // global_AnnotList.push(pl);
                                }
                            }else{
                                // if we dont have enough points just abort the takeoff
                                $('#att').empty();
                                global_toolActive = false; // THIS MAY BE THE CAUSE OF PAIN
                                resetGuiEvents('#dwgImage');
                                $(pl).fadeOut('slow', function(){
                                    $(this).remove();
                                })
                            }
                        }
                    });
                }else if(tool == 'hatchLine'){
                    // disable context menue as we want the right click to be our own
                    $(this).on('contextmenu',function(e){
                        e.preventDefault();
                        return(false);
                    });
                    // remove the dwgImage mouse event handler (inits again later)
                    $('#dwgImage').off('mousedown');
                    // remove the body mouse-up init
                    $('body').off('mouseup');

                    var relX=(e.clientX-CMT.e)/CMT.a;
                    var relY=(e.clientY-CMT.f)/CMT.d;
                    var transformOrgX = relX + (lineWidth/2);
                    var transformOrgY = relY + (0);
                    var rect = document.createElementNS("http://www.w3.org/2000/svg",'rect');
                    rect.setAttributeNS(null,'x',relX);
                    rect.setAttributeNS(null,'y',relY);
                    if(color != null){
                        rect.setAttributeNS(null,'stroke',color);
                        rect.setAttributeNS(null,'fill',color);
                        rect.setAttributeNS(null,'stroke-width',2);
                        rect.setAttributeNS(null,'fill-opacity',.75);
                    }else{
                        rect.setAttributeNS(null,'stroke','black');
                        rect.setAttributeNS(null,'fill','black');
                        rect.setAttributeNS(null,'stroke-width',2);
                        rect.setAttributeNS(null,'fill-opacity',0.75);
                    }
                    rect.setAttributeNS(null,'width',50);
                    rect.setAttributeNS(null,'height',lineWidth);
                    rect.setAttributeNS(null,'fill','url(#crossHatch)')
                    svg.appendChild(rect);

                    scaleSet = scaleWarn(scaleRatio);

                    var totalLength = 0.0;
                    $(this).mousemove(function(e){
                        // length
                        var relX2=((e.clientX-CMT.e)/CMT.a);
                        var relY2=((e.clientY-CMT.f)/CMT.d);
                        var a = relX - relX2;
                        var b = relY - relY2;
                        var w = Math.sqrt( a*a + b*b );
                        var angleDeg = Math.atan2(b, a) * 180 / Math.PI;

                        global_AnnotList[global_AnnotList.length - 1].setAttributeNS(null,'transform',`rotate(${angleDeg+180} ${transformOrgX} ${transformOrgY})`);
                        global_AnnotList[global_AnnotList.length - 1].setAttributeNS(null,'width',w);

                        if (scaleSet){
                            var lineLength = global_AnnotList[global_AnnotList.length - 1].getTotalLength();
                            var lineLengthmm = lineLength / mmScaleFactor;
                            var lineLengthinch = lineLength / inScaleFactor;
                            var lineLengthft = lineLengthinch / 12;
                            var val = parseFloat($('#takeoffQty').val());
                            if(som === "IMP"){
                                val = totalLength +(Math.round(scaleRatio * lineLengthft *100)/100);
                            }else{
                                val = (Math.round(scaleRatio * lineLengthmm *100)/100)
                            }
                            $('#takeoffQty').val(totalLength + val);
                        }
                    });

                    var qtyTotal = 0;
                    global_AnnotList = [rect,];
                    // EVENTS
                    $('#dwgImage').on('mousedown',function(e){
                        if(e.button == 1){ // aka middle button
                            PANNING = true;
                            pan_box = $('#dwgImage svg')[0].viewBox.baseVal;
                            pan_box_x = $('#dwgImage svg')[0].viewBox.baseVal.x;
                            pan_box_y = $('#dwgImage svg')[0].viewBox.baseVal.y;
                            pan_init_x = e.clientX;
                            pan_init_y = e.clientY;
                        }
                    });
                    
                    $(this).on('mouseup',function(e,ui){
                        if(e.button == 0){ // left mouse button
                            // qtyTotal += 1;
                            // $('#takeoffQty').val(qtyTotal);
                            rectNext = $(rect).clone()[0]; // clone the rectangle using jQuery then get the node
                            relX=(e.clientX-CMT.e)/CMT.a;
                            relY=(e.clientY-CMT.f)/CMT.d;
                            transformOrgX = relX + (lineWidth/2);
                            transformOrgY = relY + (lineWidth/2);
                            rectNext.setAttributeNS(null, 'x', relX);
                            rectNext.setAttributeNS(null, 'y', relY);
                            rectNext.setAttributeNS(null, 'transform',`rotate(${0} ${transformOrgX} ${transformOrgY})`)

                            svg.appendChild(rectNext);
                            global_AnnotList.push(rectNext);

                            totalLength = 0.0;
                            if (scaleSet){
                                $.each(global_AnnotList, function(i){
                                    var lineLength = global_AnnotList[global_AnnotList.length - 1].getTotalLength();
                                    var lineLengthmm = lineLength / mmScaleFactor;
                                    var lineLengthinch = lineLength / inScaleFactor;
                                    var lineLengthft = lineLengthinch / 12;
                                    if(som === "IMP"){
                                        val += (Math.round(scaleRatio * lineLengthft *100)/100);
                                    }else{
                                        val += (Math.round(scaleRatio * lineLengthmm *100)/100);
                                    }
                                });
                                $('#takeoffQty').val(totalLength);
                            }

                        }else if (e.button == 1){ // middle mouse button
                            PANNING = false;
                            pan_init_x = null;
                            pan_init_y = null;
                        }else if (e.button == 2){ // right mouse button
                            // global_AnnotList[global_AnnotList.length - 1].remove(); // this last rect is the hover and is discarded
                            // global_AnnotList.pop(); // dump the last value as its the last circle that was being tracked
                            var qty = $('#takeoffQty').val();
                            if(qty != 0){
                                sendTakeoff(type,pageGuid,itemGuid,global_AnnotList,'',description,hotkey, qty);
                            }
                        }
                    });
                }
            }
        });
    }else{
        alert("A takeoff is already in progress, please complete or cancel that one first");
    }
}

function initHotButtons(){
    $('.selectedShortcutGroupButton').each(function(idx){
        // Disable any existing functions first
        // just incase this is a double init.
        $(this).off();
    });
    $('.selectedShortcutGroupButton').each(function(idx){
        var itemGuid = $( this ).attr('id');
        $(this).click(function(){
            var color = $(this).data('color');
            var tool = $(this).data('tool');
            var hasAtt = $(this).data('hasatt');
            var description = $(this).attr('title');
            var type = $(this).data('type');
            var lineWidth = $(this).data('line-width');
            if(!lineWidth){
                lineWidth = '20';
            }
            selectCount(type,itemGuid,color,tool,description,true, true,lineWidth,this);
        });
    });
}

function setviewbox(viewboxPosition,viewboxSize,viewboxScale)
{
  var vp = {x: 0, y: 0};
  var vs = {x: 0, y: 0};
  
  vp.x = viewboxPosition.x;
  vp.y = viewboxPosition.y;
  
  vs.x = viewboxSize.x * viewboxScale;
  vs.y = viewboxSize.y * viewboxScale;

  svg = document.getElementsByTagName("svg")[0];
  svg.setAttribute("viewBox", vp.x + " " + vp.y + " " + vs.x + " " + vs.y);
  
}

function resetGuiEvents(obj){
    global_AnnotList = [];
    $(obj).off('mousemove');
    $(obj).off('mousedown');
    $(obj).off('mouseup');
    $('body').off();
    $('#dwgImage').css('cursor','auto');
    initBody(); //re-init body
    
    selectObj();

    var svg = $('#dwgImage svg');

    var box = svg[0].viewBox.baseVal;

    var mouseStartPosition = {x: 0, y: 0};
    var mousePosition = {x: 0, y: 0};
    var viewboxStartPosition = {x: box.x, y: box.y};
    var viewboxPosition = {x: box.x, y: box.y};
    var viewboxSize = {x: box.width, y: box.height};
    var viewboxScale = 1;

    var mouseDown = false;

    svg.off();
    svg.on("mousemove", function (e){
      mousePosition.x = e.offsetX;
      mousePosition.y = e.offsetY;
      
      if (mouseDown)
      {
        viewboxPosition.x = viewboxStartPosition.x + (mouseStartPosition.x - e.pageX) * viewboxScale*1.1;
        viewboxPosition.y = viewboxStartPosition.y + (mouseStartPosition.y - e.pageY) * viewboxScale*1.1;
    
        setviewbox(viewboxPosition,viewboxSize,viewboxScale);
      }
    });
    svg.on("mousedown", function (e) {
        if(e.which == 1){
            if(e.shiftKey == false){
                $('svg .selected').fadeOut('normal', function(){
                    $(this).remove();
                });
            }
        }
        $('.controlPoint').fadeOut('normal', function(){
            $(this).remove();
        });

        mouseStartPosition.x = e.pageX;
        mouseStartPosition.y = e.pageY;
      
        viewboxStartPosition.x = viewboxPosition.x;
        viewboxStartPosition.y = viewboxPosition.y;
      
        window.addEventListener("mouseup", function (e) {
            $(this.window).off('mouseup');
            mouseDown = false;
        });
      
        mouseDown = true;
    });
    svg.on("wheel", function (e) {
        var CMT = svg[0].getScreenCTM();
        var scale = (e.originalEvent.wheelDelta > 0) ? 0.8 : 1.2;

        if ((viewboxScale * scale < 8.) && (viewboxScale * scale > 1./256.)){
            var cpos = {x: (e.clientX-CMT.e)/CMT.a, y: (e.clientY-CMT.f)/CMT.d}

            viewboxPosition.x = (viewboxPosition.x - cpos.x)* scale + cpos.x;
            viewboxPosition.y = (viewboxPosition.y - cpos.y)* scale + cpos.y;
            viewboxScale *= scale;
        
            setviewbox(viewboxPosition,viewboxSize,viewboxScale);
            scaleCalc = Math.round(viewboxScale * 100)/100;
            $('#zoomRange').val(scaleCalc);
        }
    });

    $('#zoomRange').change(function(e){
        viewboxScale = $(this).val();
    
        setviewbox(viewboxPosition,viewboxSize,viewboxScale);

    });

    initContextMenuDrawing();

    return(false);
}

function quantifyTools(){
    // Set hotkeys
    $('html').off();
    $('html').keyup(function(e){
        // DELETE Key Used to delete the highlighted annot
        if(e.keyCode == 46){
            delAnnot();
        }else if(e.keyCode == 107){
            // svgZoomIn(zoomFactor);
        }else if(e.keyCode == 109){
            // svgZoomOut(zoomFactor);
        }
        
    });

    // pan();

    resetGuiEvents('#dwgImage');

    selectObj();

    initBody();

    initHotButtons();
}