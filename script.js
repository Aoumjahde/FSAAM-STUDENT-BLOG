// Client 
//Get stored data

let storedToken = localStorage.getItem('jwtToken');
let storedUsername = localStorage.getItem('username');

// set the username in the HTML

const usernameElement = document.getElementById('username');
usernameElement.textContent = storedUsername;

// Load page and event listeners

document.addEventListener('DOMContentLoaded', ()=>{
    const baseURL = window.location.origin;
    fetchPosts(baseURL);

    if (storedToken) {
        const storedRole = localStorage.getItem('userRole');
        if (storedRole=='admin'){
            showAdminFeatures();
        }
    }

    const form = document.getElementById('new-post-form');
    if (form) {
        form.addEventListener('submit', (event) => createPost(event, baseURL));
    }

    // Loging form
    const loginFrom = document.getElementById('login-form');
    loginFrom.addEventListener('submit', (event) => loginUser(event, baseURL))

    // register form
    const registerFrom = document.getElementById('register-form');
    registerFrom.addEventListener('submit', (event) => registerUser(event, baseURL))
});

// Post dETAILS

const postDetailCotainer = document.getElementById('post-detail-container');

// Add a listener for detail page

window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');

    if (postId) {
        showPostDetail(postId)
    }
});

// Fetch postes

async function fetchPosts(baseURL) {

    const res = await fetch(`${baseURL}/posts`);
    const data = await res.json();
    const postsList = document.getElementById('posts-list');
    const isAdmin = localStorage.getItem('userRole') === 'admin';

    if (postsList){
        postsList.innerHTML = data
            .map((post , index) => {
                const deleteButtonStyle = isAdmin ? '': 'display: none';
                const updateButtonStyle = isAdmin ? '': 'display: none';

                return `
                <div id="${post._id}" class="post">
                    <img src="${post.imageURL}" alt='image>
                    <div class="post-title">
                        ${
                            index === 0
                            ? `<h1><a href="/posts/${post._id}">${post.tile}</a></h1>`
                            :`<h3><a href="/posts/${post._id}">${post.tile}</a></h3>`
                        }
                    </div>
                        ${
                            index === 0
                            ? `<span><p>${post.author}<p>${post.timestamp}</p></p></span>`
                            :''
                        }
                    <div id="admin-buttons">
                        <button class="btn" style="${deleteButtonStyle}" onclick= "deletePost('${post._id}', '${baseURL}')">Delet</button>
                        <button class="btn" style="${updateButtonStyle}" onclick= "showUpdateForm('${post._id}', '${post.title}', ${post.content})">Update</button>
                    </div>
                     ${index === 0 ? '<hr>': ''}
                     ${index === 0 ? '<h2>All Articles<h2/>': ''}
                            
                    <hr/>
                </div>
                `
            }).join('');
    }
}

async function createPost(event, baseURL) {
    event.preventDefault();
    const titleInput= document.getElementById('title');
    const contentInput= document.getElementById('content');
    const imageURLInput= document.getElementById('image-url');

    // Get the values from the input fields

    const title = titleInput.value;
    const content = titleInput.value;
    const imageURL = titleInput.value;


    // ensure that inputs are not empty

    if (!title || !content || !image){
        alert('Please fill in all fields.1');
        return;
    }

    const newPost = {
        title,
        content,
        imageURL,
        author: storedUsername,
        timestamp: new Date().toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day:'numeric'}),
    };

    const headers= new Headers ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storedToken}`,
    });

    const requestOptions = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(newPost)
    };

    try {
        const response= await fetch(`${baseURL}/posts`, requestOptions);

        if(!response.ok){
            const storedRole = localStorage.getItem('userRole');
            console.log(`Error creating the post: HTTP Status ${response.status}`)
        }else {
            // clearing the data of the input
            titleInput.value = '';
            contentInput.value = '';
            imageURLInput.value = '';
            alert('Create post successful !')
        }
    }catch (error){
        console.log('An error occured during the fetch: ', error);
        alert('Create post failed.');
    }
    fetchPosts(baseURL);
    
}


// Delelting posts

async function deletePost(postId, baseURL){
    const deleteUrl = `${baseURL}/posts${postId}`;
    try {
        const response = await fetch(deleteUrl,{
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${storedToken}`,
            }
        });

        if(response.ok){
            alert('Delete post successfule');
            fetchPosts(baseURL);
        }else {
            alert('Delete post failed.')
        }

    }catch(error) {
        console.error(`Error while deleting post: ${error}`)
        alert('Delete post failed.')
    }
 
}


// Update form  

function  showUpdateForm(postId, title, content) {
    const updateFrom = `
    <form id="upade-fomr">
        <input type= "text" id="update-title" value= "${title}" />
        <textarea id="update-content">${content}</textarea>
        <button ""type="submit">Update post</button>

    </form>
    `

    const postElement = document.getElementById(postId);
    postElement.innerHTML += updateFrom;

    const form = document.getElementById('Update-form');
    form.addEventListener('submit', (event) => showUpdateForm(event, postId));
}

// Post Updationg

async function updatePost(event, postId) {
    event.preventDefault();

    const title = document.getElementById('update-title').value;
    const content = document.getElementById('update-content').value;
    const baseURL = window.location.origin;

    // check if inputs not empty

    if (!title || !content) {
        alert('Please fill in all fields.2');
        return;
    }

    const updatedPost = {
        title,
        content
    };

    try {
        const response = await fetch (`${baseURL}/posts/${postId}`,{
            method: 'PUT',
            headers: {
                "Content-Type": 'application/json',
                Authorization: `Bearer ${storedToken}`,
            },    
            body: JSON.stringify(updatePost)
        });

        if(response.ok){
            alert('Update post successfule');
            fetchPosts(baseURL);
        }else {
            alert('Update post failed.1')
        }

        }catch(error) {
            console.error(`An error occured during the  fetch: ${error}`)
            alert('Update post failed.2')
        }
}


// Regestier

async function registerUser(event, baseURL) {
    event.preventDefault();

    const usernameInput = document.getElementById('register-username');
    const passwordInput = document.getElementById('register-password');
    const roleInput = document.getElementById('register-role');

    const username = usernameInput.value;
    const password = passwordInput.value;
    const role = roleInput.value;
    // check if inputs not empty

    if (!username || !password || !role) {
        alert('Please fill in all fields.3');
        return;
    }

    const newUser = {
        username,
        password,
        role,
    };

    try {
        const response = await fetch (`${baseURL}/register`,{
            method: 'POST',
            headers: {
                "Content-Type": 'application/json',
            },    
            body: JSON.stringify(newUser)
        });

        const data =  await response.json()

        if(data.success){
            alert('Registered successful !');
            usernameInput.value = '';
            passwordInput.value = '';
            roleInput.value = '';
        }else {
            alert('Registration failed.')
        }
        }      
        catch(error) {
            console.error(`An error occured during the  fetch: ${error}`)
            alert('Update post failed.3')
        }
}



