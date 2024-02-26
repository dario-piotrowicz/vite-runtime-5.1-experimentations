export function render() {
    const input = document.getElementById('input-b');

    if(input) {
        input.innerHTML = `
            <input type="text"></input>
        `;
    }
}