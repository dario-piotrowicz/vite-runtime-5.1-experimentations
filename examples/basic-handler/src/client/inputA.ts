export function render() {
    const input = document.getElementById('input-a');

    if(input) {
        input.innerHTML = `
            <input type="text"></input>
        `;
    }
}