export function render(inputValue: string = '') {
  const inputWrapper = document.getElementById('input-b-wrapper');

  if (inputWrapper) {
    inputWrapper.innerHTML = `
            <label>Input B: </label>
            <input type="text" id="input-b" value="${inputValue}"></input>
        `;
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(updatedModule => {
    const input = document.getElementById('input-b');

    if (input) {
      const inputValue = (input as HTMLInputElement).value;
      console.log(
        `\x1b[35m[HMR] updating input B element, reusing existing value: "${inputValue}"\x1b[0m`,
      );
      updatedModule?.render(inputValue);
    }
  });
}
