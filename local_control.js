// const API_KEY = "fa68552a-9f2d-43da-9fa9-27f69eedcff6";
// const Peer = window.Peer;
// const SERVER_ID = "Server";
// const CLIENT_ID = "Client";
let allowContinue = false;
let attempts = 0;
let forwardDistance = 0.0;
let _request = false;
let _response = false;

// const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async function main() {
    // const serverTrigger = document.getElementById('js-server');
    // const clientTrigger = document.getElementById('js-client');
    // const mode = document.getElementById('js-mode');
    // const serverComp = document.getElementById('js-server-component');
    // const clientComp = document.getElementById('js-client-component');
    let localVideo = document.getElementById('js-local-stream');
    // const remoteVideo = document .getElementById('js-remote-stream');
    const captureTrigger = document.getElementById('js-startcapture-trigger');
    const deleteCapturteTrigger = document.getElementById('js-deletecapture-trigger');
    // const callTrigger = document.getElementById('js-call-trigger');
    // const closeTrigger = document.getElementById('js-close-trigger');
    const connectRosTrigger = document.getElementById('js-connect-ros');
    const ifContinue = document.getElementById('js-continue');
    const attemptExpected = document.getElementById('js-attempts');
    const forward = document.getElementById('js-forward');
    const commandTrigger = document.getElementById('js-command-trigger');
    const messages = document.getElementById('js-messages');
    // let peer = null
    let targetDevice = null;
    // let mediaConnection = null;
    // let dataConnection = null;
    // let videoTrack;

    //Time stamp
    function getTime() {
        var date = new Date();
        return date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2) + '.' + date.getMilliseconds();
    }

    //connect ros
    function roslib() {
        const ros = new ROSLIB.Ros({
            url: 'ws://192.168.6.114:9090'
        });

        ros.on('connection', () => {
            console.log('Connected to websocket server');
        });

        ros.on('error', error => {
            console.log('Error connecting to websocket server: ', error);
        });

        ros.on('close', () => {
            console.log("Connection to websocket server was closed");
        });

        const pruningAssistServer = new ROSLIB.Service({
            ros: ros,
            name: '/PruningAssist',
            serviceType: 'fanuc_manipulation/PruningAssist',
        });

        pruningAssistServer.advertise(async (req, res) => {
            res.allow_continue = false;
            res.attempts = 0;
            res.forward_distance = 0.0;
            console.log("service call");
            time = getTime();
            messages.textContent += `${time}\tService call\n`;
            _request = true;
            // await pushApply;
            res.allow_continue = true;
            res.attempts = 1;
            res.forward_distance = 0.2;
            return true;
            // console.log(unixtime);
            // res.allow_continue = true;
            // res.attempts = 1;
            // res.forward_distance = 0.2;
            // return true;
            //     flg = false;
            //     let id = window.setInterval(function (tmp_) {
            //         let unixtime = date.getTime();
            //         console.log(unixtime);
            //         if (tmp_) {
            //             console.log("response");
            // res.allow_continue = true;
            // res.attempts = 1;
            // res.forward_distance = 0.2;
            //             flg = true;
            //             // res.allow_continue = allowContinue;
            //             // res.attempts = attempts;
            //             // res.forward_distance = forwardDistance;
            //             console.log(res);
            //             _response = false;
            //             window.clearInterval(id);
            //             // return true;
            //         }
            //         else {
            //             console.log('false');
            //             res.allow_continue = true;
            //             res.attempts = 1;
            //             res.forward_distance = 0.2;
            //             // return true;
            //         }
            //     }, 500, tmp);
            //     if(flg){
            //     return true;
            // });
        });
    }

    connectRosTrigger.addEventListener('click', () => {
        new roslib();
    })

    commandTrigger.addEventListener('click', () => {
        if (_request) {
            try {
                time = getTime();
                if (ifContinue.checked) {
                    if (attemptExpected.value > 0 || forward.value > 0) {
                        messages.textContent += `${time}\tError : Command is duplicated!!\n`;
                        throw new Error('命令が重複しています。');
                    }
                }
                else {
                    if (attemptExpected.value > 0 && forward.value > 0) {
                        messages.textContent += `${time}\tError : Command is duplicated!!\n`;
                        throw new Error('命令が重複しています。');
                    }
                    else if (attemptExpected.value == 0 && forward.value == 0) {
                        messages.textContent += `${time}\tError : Command is not selected!!\n`;
                        throw new Error('命令が選択されていません。')
                    }
                }
                allowContinue = ifContinue.checked;
                attempts = attemptExpected.value;
                forwardDistance = forward.value;
                if (ifContinue.checked) {
                    text = `Continue pruning!`;
                    ifContinue.checked = false;
                }
                else if (attemptExpected.value > 0) {
                    text = `Attempt more ${attemptExpected.value} time!`;
                    attemptExpected.value = 0;
                }
                else if (forward.value > 0) {
                    text = `Go ${forward.value} m forward!`;
                    forward.value = 0;
                }
                _response = true;
            }
            catch (e) {
                console.error(e.name, e.message)
            }
        }
        resolve();
    });

    function populateCameras() {
        if (!("mediaDevices" in navigator)) return;
        navigator.mediaDevices.enumerateDevices().then(mediaDevices => {
            while (cameraSelect.options.length > 0) {
                cameraSelect.remove(0);
            }
            const defaultOption = document.createElement("option");
            defaultOption.id = "default";
            defaultOption.textContent = "(default camera) ";
            cameraSelect.appendChild(defaultOption);

            const videoInputDevices = mediaDevices.filter(
                mediaDevice => mediaDevice.kind == "videoinput"
            );
            if (videoInputDevices.length > 0) {
                cameraSelect.disabled = false;
            }
            videoInputDevices.forEach((videoInputDevice, index) => {
                if (!videoInputDevice.deviceId) {
                    return;
                }
                const option = document.createElement("option");

                option.id = videoInputDevice.deviceId;
                option.textContent = videoInputDevice.label || `Camera ${index + 1}`;
                option.selected = deviceId == option.id;
                cameraSelect.appendChild(option);
            });
        });
    }

    window.addEventListener("DOMContentLoaded", populateCameras);
    if ("mediaDevices" in navigator) {
        navigator.mediaDevices.addEventListener("devicechange", populateCameras);
    }

    let deviceId = "default";
    cameraSelect.onchange = _ => {
        deviceId = cameraSelect.selectedOptions[0].id;
        targetDevice = deviceId
    };

    let videoCallOptions = {
        audioCodec: "opus"
    };

    let localStream = null;

    captureTrigger.addEventListener('click', () => {
        navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                deviceId: String(targetDevice),
            }
        }).then(function (mediaStream) {
            localStream = mediaStream;
            localVideo.srcObject = mediaStream;
            localVideo.playsInline = true;
            localVideo.play().catch(console.error);
            videoTrack = localStream.getTracks()[1];//[0]is audio,[1]is video
        })
    })

    deleteCapturteTrigger.addEventListener('click', () => {
        localStream = null;
        localVideo.srcObject = null;
    })
}
)();