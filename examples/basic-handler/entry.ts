export default {
  async fetch(_request: Request) {
    return new Response(html, {
      headers: {
        'content-type': 'text/html',
      },
    });
  },
};

const html = `
<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<link rel="icon" type="image/svg+xml" href="src/favicon.svg" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Vite App</title>
	</head>
	<body>
		<div>
			<h1>Hello  World</h1>
		</div>
	</body>
</html>
`;
