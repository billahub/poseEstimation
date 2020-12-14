
'use strict';

var btn_play_pause = document.getElementById("btn-play-pause");
var localVideo = document.getElementById("localVideo");
var localCanvas = document.getElementById("localCanvas");
var tempCanvas = document.getElementById("tempCanvas");

Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
    get: function(){
        return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
    }
})

function adjustVideoSize(){
    var windowSizeRatio = window.innerWidth/window.innerHeight;
    var videoSizeRatio = localVideo.videoWidth/localVideo.videoHeight;
    if(videoSizeRatio <= windowSizeRatio){
        localVideo.style.height = window.innerHeight+"px";
        localVideo.style.width = "auto";
    }
    else{
        localVideo.style.width = window.innerWidth+"px";
        localVideo.style.height = "auto";
    }
    var getVideoBounds = localVideo.getBoundingClientRect();
    localCanvas.style.top = getVideoBounds.top+"px";
    localCanvas.style.left = getVideoBounds.left+"px";
    localCanvas.style.width = getVideoBounds.width+"px";
    localCanvas.style.height = getVideoBounds.height+"px";
}
  
window.onresize = function(){
    adjustVideoSize();
}
  
localVideo.onresize = function(){
    adjustVideoSize();
}

window.onload = function(){
    adjustVideoSize();
}

btn_play_pause.addEventListener("click", function(){
    var icon = btn_play_pause.firstElementChild;
    if(icon.classList.contains("fa-play")){
        icon.classList.remove("fa-play");
        icon.classList.add("fa-pause");
        localVideo.play();
        sendPost(true);
    }else{
        icon.classList.remove("fa-pause");
        icon.classList.add("fa-play");
        localVideo.pause();
    }
})

function dataURItoBlob(dataURI) {
    var byteString = atob(dataURI.split(',')[1]);
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], {type: mimeString});
}

function getImageFromVideo(){
    tempCanvas.width = localVideo.offsetWidth;
    tempCanvas.height = localVideo.offsetHeight;
    tempCanvas.getContext('2d').drawImage(localVideo, 0 , 0, localVideo.offsetWidth, localVideo.offsetHeight);
    var dataURL = tempCanvas.toDataURL();
    return dataURL;
}

function sendPost(toggle){
    var formData = new FormData();
    formData.append("image", dataURItoBlob(getImageFromVideo()), "image.png");
    $.ajax({
        type: 'POST',
        data: formData,
        url: 'http://localhost:5000/getpose',
        processData: false,
        contentType: false,
        success: function(data){
            console.log("Data : ",data);
        }
     })
}