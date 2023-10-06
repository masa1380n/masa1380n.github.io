const API_KEY = "fa68552a-9f2d-43da-9fa9-27f69eedcff6";
const Peer = window.Peer;
let Allow_continue, Attempts, Forward_distance;
let allowApply = false;

// function roslib() {
    const ros = new ROSLIB.Ros({
        url: 'wss://192.168.6.145:9090'
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

    pruningAssistServer.advertise((req, res) => {
        if (req.call) {
            allowApply = true;
            console.log("service call");
        }
        res.allow_continue = Allow_continue;
        res.attempts = Attempts;
        res.forward_distance = Forward_distance;
        return true;
    });
// }

(async function main() {
    let localVideo = document.getElementById('js-local-stream');
    const server = document.getElementById('js-server');
    const client = document.getElementById('js-client');
    const localId = document.getElementById('js-local-id');
    const makePeerTrigger = document.getElementById('js-makepeer-trigger');
    const captureTrigger = document.getElementById('js-startcapture-trigger');
    const deleteCapturteTrigger = document.getElementById('js-deletecapture-trigger');
    const callTrigger = document.getElementById('js-call-trigger');
    const closeTrigger = document.getElementById('js-close-trigger');
    const remoteVideo = document.getElementById('js-remote-stream');
    const remoteId = document.getElementById('js-remote-id');
    const messages = document.getElementById('js-messages');
    const ifContinue = document.getElementById('js-continue');
    const attempts = document.getElementById('js-attempts');
    const forward = document.getElementById('js-forward');
    const commandTrigger = document.getElementById('js-command-trigger');
    let peer = null
    let targetDevice = null;
    let mediaConnection = null;
    let dataConnection = null;
    let videoTrack;

    server.addEventListener('click', () => {
        // new roslib();
    })

    makePeerTrigger.addEventListener('click', () => {
        var userName = document.getElementById('js-your-id').value;
        console.log(userName);
        peer = (window.peer = new Peer(userName,
            {
                key: API_KEY,
                debug: 3
            }
        ))
        //document.getElementById('js-local-id') = String(peer);
        peer.on('open', id => (localId.textContent = id));
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

    let command = { continue: false, attempt: 0, forward: 0 };

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

            mediaConnection = peer.call(remoteId.value, localStream, videoCallOptions);

            mediaConnection.on('stream', async (stream) => {
                console.log('MORATTAYO')
                // Render remote stream for client
                remoteVideo.srcObject = stream;
                remoteVideo.playsInline = true;
                await remoteVideo.play().catch(console.error);
            });

            mediaConnection.once('close', () => {
                remoteVideo.srcObject.getTracks().forEach(track => track.stop());
                remoteVideo.srcObject = null;
            });

            dataConnection = peer.connect(remoteId.value);

            dataConnection.once('open', async () => {
                messages.textContent += `=== DataConnection has been opened ===\n`;
                commandTrigger.addEventListener('click', onClickApply);
            });

            dataConnection.on('data', data => {
                // messages.textContent += `${data}\n`;
            });

            dataConnection.once('close', () => {
                messages.textContent += `=== DataConnection has been closed ===\n`;
                commandTrigger.removeEventListener('click', onClickApply);
            });

            function onClickApply() {
                try {
                    if (!allowApply) {
                        throw new Error('命令が許可されていません。');
                    }
                    if (ifContinue.checked) {
                        if (attempts.value > 0 || forward.value > 0) {
                            throw new Error('命令が重複しています。');
                        }
                    }
                    else {
                        if (attempts.value > 0 && forward.value > 0) {
                            throw new Error('命令が重複しています。');
                        }
                    }
                    command.continue = ifContinue.checked;
                    command.attempt = attempts.value;
                    command.forward = forward.value;
                    const json_data = JSON.stringify(command);
                    dataConnection.send(json_data);
                    if (ifContinue.checked) {
                        text = `Continue pruning!`;
                        ifContinue.checked = false;
                    }
                    else if (attempts.value > 0) {
                        text = `Attempt more ${attempts.value} time!`;
                        attempts.value = 0;
                    }
                    else if (forward.value > 0) {
                        text = `go ${forward.value} m forward!`;
                        forward.value = 0;
                    }
                    time = getTime();
                    messages.textContent += `${time}\t${text}\n`;
                    allowApply = false;
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
                });

                dataConnection.on('data', data => {
                    let command = JSON.parse(data);
                    let text = ``;
                    if (command.continue) {
                        text = `Continue pruning!`;
                        Allow_continue = command.continue;
                        //continueされたときの処理
                    }
                    else if (command.attempt > 0) {
                        text = `Attempt more ${command.attempt} time!`;
                        Attempts = command.attempt;
                        //attemptされたときの処理
                    }
                    else if (command.forward > 0) {
                        text = `go ${command.forward} m forward!`;
                        Forward_distance = command.forward;
                        //forwardされたときの処理
                    }
                    time = getTime();
                    messages.textContent += `${time}\t${text}\n`;
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