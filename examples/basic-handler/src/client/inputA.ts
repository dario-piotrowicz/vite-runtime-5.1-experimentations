export function render(inputValue: string = '') {
  const inputWrapper = document.getElementById('input-a-wrapper');

  if (inputWrapper) {
    inputWrapper.innerHTML = `
            <label>Input A: </label>
            <input type="text" id="input-a" value="${inputValue}"></input>
        `;
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(updatedModule => {
    const input = document.getElementById('input-a');

    if (input) {
      const inputValue = (input as HTMLInputElement).value;
      console.log(
        `\x1b[35m[HMR] updating input A element, reusing existing value: "${inputValue}"\x1b[0m`,
      );
      updatedModule?.render(inputValue);
    }
  });
}
