const cameraInit = () => {
    const video = document.getElementById('video');
    navigator.mediaDevices
        .getUserMedia({
            video: true,
            audio: false,
        })
        .then((stream) => {
            video.srcObject = stream;
            video.play();
        })
        .catch((e) => {
            console.log(e);
        });
}