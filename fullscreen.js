// Re-enter fullscreen mode if the state is true
window.addEventListener('load', () => {
    if (sessionStorage.getItem('fullscreen') === 'true') {
        document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Error attempting to re-enter fullscreen mode: ${err.message} (${err.name})`);
        });
    }
});

// Add fullscreen button dynamically with an icon
const fullscreenButton = document.createElement('button');
fullscreenButton.id = 'fullscreen-button';
fullscreenButton.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1000;
    background-color: transparent;
    border: none;
    cursor: pointer;
    padding: 10px;
    outline: none;
`;

// Add an icon for the button (example using Unicode symbol)
const icon = document.createElement('span');
icon.innerHTML = '&#x26F6;'; // Unicode symbol for fullscreen (change if needed)
icon.style.cssText = `
    font-size: 25px;
    color: #fff;
    //background-color: #000;
    border-radius: 10%;
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
`;
fullscreenButton.appendChild(icon);
document.body.appendChild(fullscreenButton);

// Toggle fullscreen mode and save state
fullscreenButton.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
            .then(() => {
                sessionStorage.setItem('fullscreen', 'true');
            })
            .catch((err) => {
                console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
            });
    } else {
        document.exitFullscreen()
            .then(() => {
                sessionStorage.setItem('fullscreen', 'false');
            })
            .catch((err) => {
                console.error(`Error attempting to exit fullscreen mode: ${err.message} (${err.name})`);
            });
    }
});
