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
    if (!confirm('Are you sure you want to delete this tea?')) {
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

// Format date as "MON D, YYYY" (e.g. NOV 2, 2025)
const formatDate = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()
    const day = d.toLocaleString('en-US', { day: 'numeric', timeZone: 'UTC' })
    const year = d.toLocaleString('en-US', { year: 'numeric', timeZone: 'UTC' })
    return `${month} ${day}, ${year}`
}

// Render a single item (ordered layout requested)
const renderItem = (item) => {
    const div = document.createElement('div')
    div.classList.add('item-card')
    div.setAttribute('data-id', item.id)

    const primary = item.primaryColor || '#d19234ff'
    const secondary = item.secondaryColor || '#c4c8cf'

    const favoriteSrc = item.favorite ? './assets/favorite-true.svg' : './assets/favorite-false.svg'
    const caffeineIcon = (item.caffeineLevel && Number(item.caffeineLevel) > 0) ? './assets/caf-true-icon.svg' : './assets/caf-false-icon.svg'

    const ratingValue = Math.max(0, Math.min(5, Number(item.rating) || 0))

    const companyText = item.company ? item.company : '<i>Unknown</i>'

    const template = /*html*/`
    <div class="item-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;">
        <div style="display:flex;flex-direction:column;">
            <h3 style="margin:0">${item.name}</h3>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.35rem;">
                <img src="./assets/company-icon.svg" alt="company" style="width:18px;height:18px;" />
                <div class="company-info">${companyText}</div>
            </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.25rem;">
            <div style="display:flex;gap:0.5rem;align-items:center;">
                <img src="${favoriteSrc}" alt="favorite" style="width:26px;height:26px;" />
                <img src="${caffeineIcon}" alt="caffeine" style="width:22px;height:22px;" />
            </div>
        </div>
    </div>

    <div class="caffeine-row" style="display:flex;align-items:center;gap:0.5rem;margin-top:0.6rem;">
        <meter max="10" min="0" value="${item.caffeineLevel || 0}" style="flex:1;height:1rem;"></meter>
        <img src="${caffeineIcon}" alt="caffeine" style="width:22px;height:22px;" />
    </div>

    <div class="rating-row" style="display:flex;align-items:center;gap:0.5rem;margin-top:0.6rem;">
        <meter max="5" min="1" value="${ratingValue || 1}" style="width:140px;height:1rem;"></meter>
        <div style="font-weight:700">${ratingValue}/5</div>
    </div>

    <div class="date-row" style="margin-top:0.35rem;color:#666;">${formatDate(item.dateConsumed)}</div>

    <section class="notes" style="${item.notes ? '' : 'display:none;'};margin-top:0.6rem;">
        <p style="margin:0">${item.notes || ''}</p>
    </section>

    <div style="display:flex;gap:1rem;justify-content:flex-end;margin-top:0.6rem;">
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
    </div>
    `

    div.innerHTML = DOMPurify.sanitize(template)

    const editBtn = div.querySelector('.edit-btn')
    const deleteBtn = div.querySelector('.delete-btn')
    if (editBtn) editBtn.addEventListener('click', () => editItem(item))
    if (deleteBtn) deleteBtn.addEventListener('click', () => deleteItem(item.id))

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

// Hide popover on initial load
popoverHide(formPopover)

// Load initial data
getData()
