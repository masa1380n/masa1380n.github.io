const API_KEY = "fa68552a-9f2d-43da-9fa9-27f69eedcff6";
const Peer = window.Peer;
const SERVER_ID = "Server";
const CLIENT_ID = "Client";
let allowContinue = false;
let attempts = 0;
let forwardDistance = 0;
let request = false;
let response = false;
const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async function main() {
    const serverTrigger = document.getElementById('js-server');
    const clientTrigger = document.getElementById('js-client');
    const mode = document.getElementById('js-mode');
    const serverComp = document.getElementById('js-server-component');
    const clientComp = document.getElementById('js-client-component');
    let localVideo = document.getElementById('js-local-stream');
    const remoteVideo = document.getElementById('js-remote-stream');
    const captureTrigger = document.getElementById('js-startcapture-trigger');
    const deleteCapturteTrigger = document.getElementById('js-deletecapture-trigger');
    const callTrigger = document.getElementById('js-call-trigger');
    const closeTrigger = document.getElementById('js-close-trigger');
    const ifContinue = document.getElementById('js-continue');
    const attemptExpected = document.getElementById('js-attempts');
    const forward = document.getElementById('js-forward');
    const commandTrigger = document.getElementById('js-command-trigger');
    const messages = document.getElementById('js-messages');
    let peer = null
    let targetDevice = null;
    let mediaConnection = null;
    let dataConnection = null;
    let videoTrack;

    function roslib() {
        const ros = new ROSLIB.Ros({
            url: 'ws://192.168.6.112:9090'
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
            console.log("service call");
            if (req.call) {
                request = true;
                while (!response) {
                    await _sleep(100);
                    console.log("waiting for command..")
                }
                res.allow_continue = allowContinue;
                res.attempts = attempts;
                res.forward_distance = forwardDistance;
                response = false;
            }
            return true;
        });
    }

    let switchComponent = (el) => {
        if (el.style.display == '') {
            el.style.display = 'none';
        } else {
            el.style.display = '';
        }
    }

    serverTrigger.addEventListener('click', () => {
        new roslib();
        switchComponent(serverComp);
        peer = (window.peer = new Peer(SERVER_ID,
            {
                key: API_KEY,
                debug: 3
            }
        ))
        peer.on('open', id => (mode.textContent = id));
        waitCall();
    });

    clientTrigger.addEventListener('click', () => {
        switchComponent(clientComp);
        peer = (window.peer = new Peer(CLIENT_ID,
            {
                key: API_KEY,
                debug: 3
            }
        ))
        peer.on('open', id => (mode.textContent = id));
        waitCall();
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
        // videoBandwidth: Number(document.getElementById('js-video-byte').value),
        // videoCodec: String(document.getElementById('js-video-codec').value),
        audioCodec: "opus"
    };

    let localStream = null;

    captureTrigger.addEventListener('click', () => {
        navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                // width: Number(document.getElementById('video-width').value),
                // height: Number(document.getElementById('video-height').value),
                // frameRate: Number(document.getElementById('video-rate').value),
                deviceId: String(targetDevice),
            }
        }).then(function (mediaStream) {
            localStream = mediaStream;
            localVideo.srcObject = mediaStream;
            localVideo.playsInline = true;
            localVideo.play().catch(console.error);
            videoTrack = localStream.getTracks()[1];//[0]is audio,[1]is video
            videoTrackSettings = videoTrack.getSettings();
            capabilities = videoTrack.getCapabilities();
            // videoTrack.contentHint = document.getElementById("js-video-content").value;
        })
    })

    deleteCapturteTrigger.addEventListener('click', () => {
        localStream = null;
        localVideo.srcObject = null;
    })

    let command = { continue: false, attempt: 0, forward: 0, request: false };

    //Time stamp
    function getTime() {
        var date = new Date();
        return date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2) + '.' + date.getMilliseconds();
    }

    // client
    callTrigger.addEventListener('click', () => {

        if (peer == null) {
            console.log('Peer is not opened');
        }
        if (peer != null) {
            // Note that you need to ensure the peer has connected to signaling server
            // before using methods of peer instance.

            mediaConnection = peer.call(SERVER_ID, localStream, videoCallOptions);

            mediaConnection.on('stream', async (stream) => {
                // Render remote stream for client
                remoteVideo.srcObject = stream;
                remoteVideo.playsInline = true;
                await remoteVideo.play().catch(console.error);
            });

            mediaConnection.once('close', () => {
                remoteVideo.srcObject.getTracks().forEach(track => track.stop());
                remoteVideo.srcObject = null;
            });

            dataConnection = peer.connect(SERVER_ID);

            dataConnection.once('open', async () => {
                messages.textContent += `=== DataConnection has been opened ===\n`;
                commandTrigger.addEventListener('click', onClickApply);
            });

            let command;

            dataConnection.on('data', data => {
                command = JSON.parse(data);
                if (command.request) {
                    time = getTime();
                    messages.textContent += `${time}\tPlease response command!!\n`;
                }
            });

            dataConnection.once('close', () => {
                messages.textContent += `=== DataConnection has been closed ===\n`;
                commandTrigger.removeEventListener('click', onClickApply);
            });

            function onClickApply() {
                try {
                    if (!command.request) {
                        throw new Error('命令が許可されていません。');
                    }
                    if (ifContinue.checked) {
                        if (attemptExpected.value > 0 || forward.value > 0) {
                            throw new Error('命令が重複しています。');
                        }
                    }
                    else {
                        if (attemptExpected.value > 0 && forward.value > 0) {
                            throw new Error('命令が重複しています。');
                        }
                    }
                    command.continue = ifContinue.checked;
                    command.attempt = attemptExpected.value;
                    command.forward = forward.value;
                    const json_data = JSON.stringify(command);
                    dataConnection.send(json_data);
                    if (ifContinue.checked) {
                        text = `Continue pruning!`;
                        ifContinue.checked = false;
                    }
                    else if (attemptExpected.value > 0) {
                        text = `Attempt more ${attemptExpected.value} time!`;
                        attemptExpected.value = 0;
                    }
                    else if (forward.value > 0) {
                        text = `go ${forward.value} m forward!`;
                        forward.value = 0;
                    }
                    time = getTime();
                    messages.textContent += `${time}\t${text}\n`;
                }
                catch (e) {
                    console.error(e.name, e.message)
                }
            }
            closeTrigger.addEventListener('click', () => mediaConnection.close(true));
        }
    });

    // server
    function waitCall() {
        if (peer != null) {
            peer.on('call', mediaConnection => {

                let videoAnswerOptions = {
                    // videoBandwidth: Number(document.getElementById('js-video-byte').value),
                    // videoCodec: String(document.getElementById('js-video-codec').value),
                    audioCodec: "opus"
                };
                // videoAnswerOptions.videoBandwidth = Number(document.getElementById('js-video-byte').value);
                //videoAnswerOptions.videoCodec = String(document.getElementById('js-video-codec').value);
                //console.log(videoAnswerOptions);

                mediaConnection.answer(localStream, videoAnswerOptions);

                mediaConnection.on('stream', async (stream) => {
                    // Render remote stream for callee
                    remoteVideo.srcObject = stream;
                    remoteVideo.playsInline = true;
                    await remoteVideo.play().catch(console.error);
                });

                mediaConnection.once('close', () => {
                    remoteVideo.srcObject.getTracks().forEach(track => track.stop());
                    remoteVideo.srcObject = null;
                });

                closeTrigger.addEventListener('click', () => mediaConnection.close(true));
            });

            peer.on('connection', dataConnection => {
                dataConnection.once('open', async () => {
                    messages.textContent += `=== DataConnection has been opened ===\n`;
                    while (!request) {
                        await _sleep(100);
                        console.log("waiting for allow..");
                    }
                    command.request = true;
                    const json_data = JSON.stringify(command);
                    dataConnection.send(json_data);
                });

                dataConnection.on('data', data => {
                    let command = JSON.parse(data);
                    let text = ``;
                    if (command.continue) {
                        text = `Continue pruning!`;
                        allowContinue = command.continue;
                        //continueされたときの処理
                    }
                    else if (command.attempt > 0) {
                        text = `Attempt more ${command.attempt} time!`;
                        attempts = command.attempt;
                        //attemptされたときの処理
                    }
                    else if (command.forward > 0) {
                        text = `go ${command.forward} m forward!`;
                        forwardDistance = command.forward;
                        //forwardされたときの処理
                    }
                    time = getTime();
                    messages.textContent += `${time}\t${text}\n`;
                    response = true;
                    request = false;
                });

                dataConnection.once('close', () => {
                    messages.textContent += `=== DataConnection has been closed ===\n`;
                });

                // Register closing handler
                closeTrigger.addEventListener('click', () => dataConnection.close(true), {
                    once: true,
                });
            });
            peer.on('error', console.error);
        }
    }
}
)();