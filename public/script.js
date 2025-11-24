let readyStatus = document.querySelector('#readyStatus')
let notReadyStatus = document.querySelector('#notReadyStatus')
let myForm = document.querySelector('#myForm')
let contentArea = document.querySelector('#contentArea')
let formPopover = document.querySelector('#formPopover')
let createButton = document.querySelector('#createButton')
let formHeading = document.querySelector('#formPopover h2')

// Popover show/hide helpers with fallbacks for browsers without the popover API
const popoverShow = (el) => {
    if (!el) return
    if (typeof el.showPopover === 'function') {
        el.showPopover()
        return
    }
    // fallback: make element visible and focus the first input
    el.style.display = 'block'
    const first = el.querySelector('input,textarea,select,button')
    if (first) first.focus()
}

const popoverHide = (el) => {
    if (!el) return
    if (typeof el.hidePopover === 'function') {
        el.hidePopover()
        return
    }
    // fallback: hide the element
    el.style.display = 'none'
}

// Get form data and process each type of input
// Prepare the data as JSON with a proper set of types
// e.g. Booleans, Numbers, Dates
const getFormData = () => {
    // FormData gives a baseline representation of the form
    // with all fields represented as strings
    const formData = new FormData(myForm)
    const json = Object.fromEntries(formData)

    // Handle checkboxes, dates, and numbers
    myForm.querySelectorAll('input').forEach(el => {
        const value = json[el.name]
        const isEmpty = !value || value.trim() === ''

            // Represent checkboxes as a Boolean value (true/false)
            if (el.type === 'checkbox') {
                json[el.name] = el.checked
            }
        // Represent number and range inputs as actual numbers
        else if (el.type === 'number' || el.type === 'range') {
            json[el.name] = isEmpty ? null : Number(value)
        }
        // Represent all date inputs in ISO-8601 DateTime format
        else if (el.type === 'date') {
            json[el.name] = isEmpty ? null : new Date(value).toISOString()
        }
    })
    return json
}


// listen for form submissions  
myForm.addEventListener('submit', async event => {
    // prevent the page from reloading when the form is submitted.
    event.preventDefault()
    const data = getFormData()
    await saveItem(data)
    myForm.reset()
    popoverHide(formPopover)
})


// Save item (Create or Update)
const saveItem = async (data) => {
    console.log('Saving:', data)

    // Determine if this is an update or create
    const endpoint = data.id ? `/data/${data.id}` : '/data'
    const method = data.id ? "PUT" : "POST"

    const options = {
        method: method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }

    try {
        const response = await fetch(endpoint, options)

        if (!response.ok) {
            try {
                const errorData = await response.json()
                console.error('Error:', errorData)
                alert(errorData.error || response.statusText)
            }
            catch (err) {
                console.error(response.statusText)
                alert('Failed to save: ' + response.statusText)
            }
            return
        }

        const result = await response.json()
        console.log('Saved:', result)


        // Refresh the data list
        getData()
    }
    catch (err) {
        console.error('Save error:', err)
        alert('An error occurred while saving')
    }
}


// Edit item - populate form with existing data
const editItem = (data) => {
    console.log('Editing:', data)

    // Populate the form with data to be edited
    Object.keys(data).forEach(field => {
        const element = myForm.elements[field]
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = data[field]
            } else if (element.type === 'date') {
                // Extract yyyy-mm-dd from ISO date string (avoids timezone issues)
                element.value = data[field] ? data[field].substring(0, 10) : ''
            } else {
                element.value = data[field]
            }
        }
    })

    // Update the heading to indicate edit mode
    formHeading.textContent = '🍵 Edit Tea'

    // Show the popover (use fallback if API missing)
    popoverShow(formPopover)
}

// Delete item
const deleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this cat?')) {
        return
    }

    const endpoint = `/data/${id}`
    const options = { method: "DELETE" }

    try {
        const response = await fetch(endpoint, options)

        if (response.ok) {
            const result = await response.json()
            console.log('Deleted:', result)
            // Refresh the data list
            getData()
        }
        else {
            const errorData = await response.json()
            alert(errorData.error || 'Failed to delete item')
        }
    } catch (error) {
        console.error('Delete error:', error)
        alert('An error occurred while deleting')
    }
}

// helper function. here to not clutter up the rest of the template
const calendarWidget = (date) => {
    if (!date) return ''
    const month = new Date(date).toLocaleString("en-CA", { month: 'short', timeZone: "UTC" })
    const day = new Date(date).toLocaleString("en-CA", { day: '2-digit', timeZone: "UTC" })
    const year = new Date(date).toLocaleString("en-CA", { year: 'numeric', timeZone: "UTC" })
    return ` <div class="calendar">
                <div class="born"><img src="./assets/birthday.svg" /></div>
                <div class="month">${month}</div>
                <div class="day">${day}</div> 
                <div class="year">${year}</div>
            </div>`

}

// Render a single item
const renderItem = (item) => {
    const div = document.createElement('div')
    div.classList.add('item-card')
    div.setAttribute('data-id', item.id)

    const primary = item.primaryColor || '#5f5854'
    const secondary = item.secondaryColor || '#c4c8cf'

    const template = /*html*/`  
    <div class="item-heading">
        <h3> ${item.name} </h3>
        <div class="company-info">${item.company ? item.company : '<i>Unknown</i>'}</div>
    </div>
    <div class="item-info"> 
        <div class="item-icon" style="
            background: linear-gradient(135deg, 
            ${primary} 0%, 
            ${primary} 40%, 
            ${secondary} 60%, 
            ${secondary} 100%); 
        ">
        </div>
        <div class="stats">
            <div class="stat">
                <span>Type</span>
                <strong>${item.type || ''}</strong>
            </div>
            <div class="stat">
                <span>Style</span>
                <strong>${item.style || ''}</strong>
            </div>
            <div class="stat">
                <span>Rating</span>
                <meter max="5" min="1" value="${item.rating || 1}"></meter>
            </div>
        </div>
        ${calendarWidget(item.dateConsumed)}
    </div>

    <section class="preferences" style="${item.preferences ? '' : 'display:none;'}">
        <h4>Preferences</h4>
        <pre>${item.preferences || ''}</pre>
    </section>

    <section class="notes" style="${item.notes ? '' : 'display:none;'}">
        <p>${item.notes || ''}</p>
    </section>

        <div class="item-actions">
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
        </div>
    `
    div.innerHTML = DOMPurify.sanitize(template);

    // Add event listeners to buttons
    div.querySelector('.edit-btn').addEventListener('click', () => editItem(item))
    div.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item.id))

    return div
}

// fetch items from API endpoint and populate the content div
const getData = async () => {
    try {
        const response = await fetch('/data')

        if (response.ok) {
            readyStatus.style.display = 'block'
            notReadyStatus.style.display = 'none'

            const data = await response.json()
            console.log('Fetched data:', data)

            if (data.length == 0) {
                contentArea.innerHTML = '<p><i>No data found in the database.</i></p>'
                return
            }
            else {
                contentArea.innerHTML = ''
                data.forEach(item => {
                    const itemDiv = renderItem(item)
                    contentArea.appendChild(itemDiv)
                })
            }
        }
        else {
            // If the request failed, show the "not ready" status
            // to inform users that there may be a database connection issue
            notReadyStatus.style.display = 'block'
            readyStatus.style.display = 'none'
            createButton.style.display = 'none'
            contentArea.style.display = 'none'
        }
    } catch (error) {
        console.error('Error fetching data:', error)
        notReadyStatus.style.display = 'block'
    }
}

// Revert to the default form title on reset
myForm.addEventListener('reset', () => formHeading.textContent = '🍵 Share a Tea')

// Reset the form when the create button is clicked. 
createButton.addEventListener('click', myForm.reset())

// Load initial data
getData()

// Hide popover on initial load
popoverHide(formPopover)

// Load initial data
getData()
