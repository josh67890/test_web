window.onload = function() {
    document.getElementById('generate').addEventListener('click', generatePassword);
    document.getElementById('show-password').addEventListener('click', showpassword);
    document.getElementById('show-final').addEventListener('click', showfinal);
  }
  
  document.addEventListener('DOMContentLoaded', function() {
    
    // if (chrome.identity) {
    //   chrome.identity.getProfileUserInfo(function(userInfo) {
    //     if(userInfo.email) {
    //       document.getElementById('email').value = userInfo.email;
    //     } else {
    //       console.error('Unable to retrieve user email address.');
    //     }
    //   });
    // } else {
    //   console.error('Chrome Identity API is not available.');
    // }
    
    document.getElementById('2fa').disabled = true;
    document.getElementById("send_button").disabled = true;
  });
  
  document.getElementById("copyButton").addEventListener("click", function() {
  var copyText = document.getElementById("password").value;
  navigator.clipboard.writeText(copyText);
});


async function showpassword(){
  const passfield = document.getElementById("privkey");
  const show = document.getElementById("privkey").type;
  if (show === "password"){
    passfield.type = "text";
  }
  else{
    passfield.type = "password";
  }
} 

async function showfinal(){
  const passfield = document.getElementById("password");
  const show = document.getElementById("password").type;
  if (show === "password"){
    passfield.type = "text";
  }
  else{
    passfield.type = "password";
  }
} 

  async function generatePassword() {
    const serverName = document.getElementById('servername').value;
    const privateKey = document.getElementById('privkey').value;
    const email = document.getElementById('email').value;
  
    if (!serverName || !privateKey || !email) {
      alert('Please supply server name, key, and email address.');
      return;
    }
  
    let sequence = "1234567890-=!@#$%^&*()_+qwertyuiop[]\\QWERTYUIOP{}|asdfghjkl;'ASDFGHJKL:\"zxcvbnm,./ZXCVBNM<>?";
    const alphanum = document.getElementById('alphanum');
    if (alphanum.checked) {
      sequence = "1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM";
    }
      
    let password_length = 16;
    const xtra_length = document.getElementById('longpassword');
    if (xtra_length.checked) {
      password_length = 12;
    }

   
    const servernameBytes = new TextEncoder().encode(serverName);
    const privkeyBytes = new TextEncoder().encode(privateKey);
    const emailBytes = new TextEncoder().encode(email);
   document.getElementById('email').value = "hello";

    const hashedBytes = new Uint8Array(await crypto.subtle.digest('SHA-384', concatBytes(privkeyBytes, servernameBytes, emailBytes, privkeyBytes)));
    const hex_hash = bytesToHex(hashedBytes);
      document.getElementById('email').value = hex_hash;
    
    const use2fa = document.getElementById("2fa-check").checked;
      if (use2fa) {
        document.getElementById('2fa').disabled = false;
        document.getElementById('send_button').disabled = false;
      }

    try {
    const response = await fetch('                                                   ', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: hex_hash,
        email: email,
        otp: use2fa
      })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok: ' + response.statusText);
        document.getElementById('email').value = response.statusText;
    }
  
      const data = await response.json();
    document.getElementById('email').value = data.hex_bytes;
      if (data.hex_bytes === "too many requests in 10 seconds" || data.hex_bytes === "exceeded limit of allowed requests a day (currently 300)") {
        alert(data.hex_bytes);
        return;
      }

      const response_bytes = hexToBytes(data.hex_bytes);
      

      if (use2fa) {
        document.getElementById("send_button").addEventListener("click", async function send2fa() {
          await handle2fa(response_bytes, privkeyBytes, sequence, password_length);
        });
      } else {
        await handleNo2fa(response_bytes, privkeyBytes, sequence, password_length);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
async function handle2fa(response_bytes, privkeyBytes, sequence, password_length) {
  const otp = new Uint8Array(hexToBytes(document.getElementById('2fa').value));
  let hashed2fa = await crypto.subtle.digest('SHA-512', otp);

  let result_bytes = xorByteArrays(new Uint8Array(response_bytes), new Uint8Array(hashed2fa));
  result_bytes = await crypto.subtle.digest('SHA-384', concatBytes(privkeyBytes, result_bytes, privkeyBytes));

  for (let i = 0; i < 50000; i++) {
    result_bytes = await crypto.subtle.digest('SHA-384', result_bytes);
  }

  const base64Password = bytesToBase64(new Uint8Array(result_bytes), sequence).substring(0, password_length);
  document.getElementById('password').value = base64Password;
}

async function handleNo2fa(response_bytes, privkeyBytes, sequence, password_length) {
  let resulting_bytes = new Uint8Array(await crypto.subtle.digest('SHA-384', concatBytes(privkeyBytes, response_bytes, privkeyBytes)));

  for (let i = 0; i < 50000; i++) {
    resulting_bytes = await crypto.subtle.digest('SHA-384', resulting_bytes);
  }

  const base64Password = bytesToBase64(new Uint8Array(resulting_bytes), sequence).substring(0, password_length);
  document.getElementById('password').value = base64Password;
}


function bytesToHex(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  try {
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
  } catch (error) {
    console.error('Error:', error);
  }
  
  return bytes;
}

function concatBytes(...arrays) {
  let totalLength = arrays.reduce((acc, value) => acc + value.length, 0);
  let result = new Uint8Array(totalLength);
  let offset = 0;
  for (let array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}


function bytesToBase64(byteArray, x ) {
  let result = "";
  let xLength = x.length;

  for (let i = 0; i < byteArray.length; i++) {
    // Use the byte value modulo the length of the string x to find the character index
    let charIndex = byteArray[i] % xLength;
    // Append the character to the result string
    result += x[charIndex];
  }

  return result;
}

function xorByteArrays(arr1, arr2) {
  // Check if arrays are of the same length
  if (arr1.length !== arr2.length) {
      throw new Error("Byte arrays must have the same length");
  }

  // Create a new Uint8Array to store the XOR results
  let result = new Uint8Array(arr1.length);

  // Perform the XOR operation for each byte
  for (let i = 0; i < arr1.length; i++) {
      result[i] = arr1[i] ^ arr2[i];
  }

  return result;
}
  
