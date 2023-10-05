const API_KEY = "fa68552a-9f2d-43da-9fa9-27f69eedcff6";
const Peer = window.Peer;

(async function main() {
    let localVideo = document.getElementById('js-local-stream');
    const localId = document.getElementById('js-local-id');
    const makePeerTrigger = document.getElementById('js-makepeer-trigger');
    const captureTrigger = document.getElementById('js-startcapture-trigger');
    const deleteCapturteTrigger = document.getElementById('js-deletecapture-trigger');
    const callTrigger = document.getElementById('js-call-trigger');
    const closeTrigger = document.getElementById('js-close-trigger');
    const remoteVideo = document.getElementById('js-remote-stream');
    const remoteId = document.getElementById('js-remote-id');
    const messages = document.getElementById('js-messages');
    const continueTrigger = document.getElementById('js-continue');
    const attempts = document.getElementById('js-attempts');
    const attemptApply = document.getElementById('js-attempt-apply');
    const forward = document.getElementById('js-forward');
    const forwardApply = document.getElementById('js-forward-apply');
    let peer = null
    let targetDevice = null;
    let mediaConnection = null;
    let dataConnection = null;
    let videoTrack;

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
                // sendTrigger.addEventListener('click', onClickSend);
                continueTrigger.addEventListener('click', onClickContinue);
                attemptApply.addEventListener('click', onClickAttemptApply);
                forwardApply.addEventListener('click', onClickForwardApply);
            });

            dataConnection.on('data', data => {
                // messages.textContent += `${data}\n`;
            });

            dataConnection.once('close', () => {
                messages.textContent += `=== DataConnection has been closed ===\n`;
                // sendTrigger.removeEventListener('click', onClickSend);
                continueTrigger.removeEventListener('click', onClickContinue);
                attemptApply.removeEventListener('click', onClickAttemptApply);
                forwardApply.removeEventListener('click', onClickForwardApply);
            });

            // function onClickSend() {
            //     const data = localText.value;
            //     dataConnection.send(data);

            //     messages.textContent += `You: ${data}\n`;
            //     localText.value = '';
            // }

            function onClickContinue() {
                const data = `continue pruning!!\n`;
                messages.textContent += `continue pruning!!\n`;
                dataConnection.send(data);

                //ここにcontinueクリックしたときの処理

            }

            function onClickAttemptApply() {
                const data = attempts.value;
                dataConnection.send(data);
                messages.textContent += `attempt ${data} more times!!\n`;

                //ここに"Attempt"を"apply"したときの処理

                attempts.value = '0';
            }

            function onClickForwardApply() {
                const data = forward.value;
                dataConnection.send(data);
                messages.textContent += `go ${data} m forward!!\n`;
                //ここに"Forward"を"apply"したときの処理

                forward.value = '0';
            }

            closeTrigger.addEventListener('click', () => mediaConnection.close(true));
        }
    });

    // Register callee handler
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
                    // sendTrigger.addEventListener('click', onClickSend);
                    // continueTrigger.addEventListener('click', onClickContinue);
                    // attemptApply.addEventListener('click', onClickAttemptApply);
                    // forwardApply.addEventListener('click', onClickForwardApply);
                });

                dataConnection.on('data', data => {
                    messages.textContent += `${data}\n`;
                });

                dataConnection.once('close', () => {
                    messages.textContent += `=== DataConnection has been closed ===\n`;
                    // sendTrigger.removeEventListener('click', onClickSend);
                    // continueTrigger.removeEventListener('click', onClickContinue);
                    // attemptApply.removeEventListener('click', onClickAttemptApply);
                    // forwardApply.removeEventListener('click', onClickForwardApply);
                });

                // Register closing handler
                closeTrigger.addEventListener('click', () => dataConnection.close(true), {
                    once: true,
                });

                // function onClickSend() {
                //     const data = localText.value;
                //     dataConnection.send(data);

                //     messages.textContent += `You: ${data}\n`;
                //     localText.value = '';
                // }

                // function onClickContinue() {
                //     messages.textContent += `continue pruning!!\n`;

                //     //ここにcontinueクリックしたときの処理

                // }

                // function onClickAttemptApply() {
                //     const data = attempts.value;
                //     dataConnection.send(data);
                //     messages.textContent += `attempt ${data} more times!!\n`;

                //     //ここに"Attempt"を"apply"したときの処理

                //     attempts.value = '0';
                // }

                // function onClickForwardApply() {
                //     const data = forward.value;
                //     dataConnection.send(data);
                //     messages.textContent += `go ${data} m forward!!\n`;
                //     //ここに"Forward"を"apply"したときの処理

                //     forward.value = '0';
                // }

            });
            peer.on('error', console.error);
        }
    }
}
)();