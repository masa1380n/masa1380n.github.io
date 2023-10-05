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

const devices = (await navigator.mediaDevices.enumerateDevices())
    .filter((device) => device.kind === 'videoinput')
    .map((device) => {
        return {
            text: device.label,
            value: device.deviceId,
        };
    });

// function populateCameras() {
//     if (!("mediaDevices" in navigator)) return;
//     navigator.mediaDevices.enumerateDevices().then(mediaDevices => {
//         while (cameraSelect.options.length > 0) {
//             cameraSelect.remove(0);
//         }
//         const defaultOption = document.createElement("option");
//         defaultOption.id = "default";
//         defaultOption.textContent = "(default camera) ";
//         cameraSelect.appendChild(defaultOption);

//         const videoInputDevices = mediaDevices.filter(
//             mediaDevice => mediaDevice.kind == "videoinput"
//         );
//         if (videoInputDevices.length > 0) {
//             cameraSelect.disabled = false;
//         }
//         videoInputDevices.forEach((videoInputDevice, index) => {
//             if (!videoInputDevice.deviceId) {
//                 return;
//             }
//             const option = document.createElement("option");

//             option.id = videoInputDevice.deviceId;
//             option.textContent = videoInputDevice.label || `Camera ${index + 1}`;
//             option.selected = deviceId == option.id;
//             cameraSelect.appendChild(option);
//         });
//     });
// }

// let deviceId = "default";
// cameraSelect.onchange = _ => {
//     deviceId = cameraSelect.selectedOptions[0].id;
//     targetDevice = deviceId
// };
