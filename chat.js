

const form = document.querySelector('form');
form.addEventListener('submit', (event) => {
   event.preventDefault();
   const input = document.querySelector('input[type="text"]');
   const value = input.value;

   const data = {
      content: value,
   };


   dataChannel.send(JSON.stringify(data));
   console.log(data.content);
   insertMessageToDOM(data.content, false)
   input.value = '';


   // insertMessageToDOM(data, true);

   // input.value = '';
});


