'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//GEOLOCATION API (232)//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class Workout {
  date = new Date(); //class fields
  id = (Date.now() + '').slice(-10); //in real life we use 3rd party library to generare id!!!!we take date.now(gives time stamp) convert it to string and take 10 last numbers, just here
  clicks = 0;

  constructor(coords, distance, duration) {
    //this.date = ...
    //this.id= ...
    this.coords = coords; //[lat,lan]
    this.distance = distance; //in km
    this.duration = duration; // in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration); //inisilaze this keyword
    this.cadence = cadence;
    this.type = 'running';
    this.calcPace();
    this._setDescription(); //should be on each of the child classes, because these clases contain type
  }
  calcPace() {
    this.pace = this.duration / this.distance; //min/km
    return this.pace;
  }
}

class Cycling extends Workout {
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); //km/h
  }
}
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 29, 94, 458);
// console.log(run1, cycling1);

///////////////////////////////////////////////////////////////////////////////////
//APLICATION ARCHITECTURE
class App {
  //private class field, properties present on the instances created by the class!!!
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = []; // this.workouts = [];

  constructor() {
    // this.workouts = [];
    //Get user's position
    this._getPosition();
    //Get date from local storage:
    this._getLocalStorage();

    //Attach event handlers:
    form.addEventListener('submit', this._newWorkout.bind(this)); //this points to the form, so we use bind(this)
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          //this._loadMap
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords; //we use destrocturing not position.coords.latitude
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`); //we copy the link from google map and insert ouwer location latitude and logitude

    const coords = [latitude, longitude]; //we create ARRAY because setView and maker expect ARRAY
    // console.log(this); //prinnts undefined if this._loadMap
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); //second value is the zoom level
    // console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling clicks on map
    this.#map.on('click', this._showForm.bind(this)); //bind to this object is App object.

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
    //on coming from leaflet library, we use it instead of addEventListener
  }

  //Clear input fields
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp)); //rest pattern ... returns ARRAY,
    const allPositive = (...inputs) => inputs.every(inp => inp > 0); //to check if the number is positive in the helper function:

    e.preventDefault();
    //Get data from Form
    const type = inputType.value;
    const distance = +inputDistance.value; //string -convert to number
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng; //lat and lng variables based on this.object
    let workout;

    //In workout running, create running OBJECT
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        // !Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(cadence)- we refactore this to the helper function validIputs
        !allPositive(distance, duration, cadence)
      )
        return alert(`Inputs have to be positive numbers`);
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //In workout cycle, create cycling OBJECT
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert(`Inputs have to be positive numbers!`);
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //Add new object to workout ARRAY
    this.#workouts.push(workout);

    //Render workout on map as marker
    this._renderWorkoutMarker(workout);

    //Render workout on list
    this._renderWorkout(workout);

    //Hide form+clear input fields
    this._hideForm();

    //set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    //Display marker
    L.marker(workout.coords) //[51.5, -0.09]
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
        </div>
      </li>`;

    if (workout.type === 'cycling')
      html += `
       <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
         </div>
     <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
         <span class="workout__unit">m</span>
  </div>
</li>
`;
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);

    if (!workoutEl) return; //not the get null when we click outside the container

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    ); //to get data out of the workouts Array.Like in the bankist.
    console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    }); //from the leaflet methods setView

    //using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;

    this.#workouts = data; //restore the data. first when we open the page #workouts is empty, so if we had something in the localStorage, we set it equal to the data we had before.

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      // this._renderWorkoutMarker(work); //the #map have not been loaded yet, so it will not work!!!Its not loaded yet. It takes some time
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload(); //to empty the local storage, location is object in the broswer which contains lots of properties and methods
  }
}

const app = new App();
