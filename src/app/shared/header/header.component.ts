import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
username:string = "Frederik Beck";
useremail:string = " fred.back@email.com ";
edit: boolean = false;
private wasEmpty = true;

constructor(private router: Router) { }

goToLogin() {
  window.location.href = '/login';
}

onInputChange(value: string) {
  const searchResultsContacts = document.getElementById("search-results-contacts");
  const searchResultsChannels = document.getElementById("search-results-channels");
  if (this.wasEmpty && value.length > 0) {
    this.searchBar(value);
    this.wasEmpty = false;
  }
  if (value.length === 0) {
    this.wasEmpty = true;
    searchResultsContacts?.classList.add("no-display");
    searchResultsChannels?.classList.add("no-display");
  }
}

searchBar(value: string) {
  const searchResultsContacts = document.getElementById("search-results-contacts");
  const searchResultsChannels = document.getElementById("search-results-channels");
  if (value === "@") {
     searchResultsContacts?.classList.remove("no-display");
  } else if (value === "#") {
   searchResultsChannels?.classList.remove("no-display");
  }
}

toggleDropdown() {
  const dropdown = document.getElementById("dropdownMenu");
  if (dropdown) {
    dropdown.classList.toggle("no-display");
  } 
}

stopPropagation(event: Event) {
  event.stopPropagation();
}

toggleProfile() {
  this.edit = false;
  console.log("yo");
  
  const profileMenu = document.getElementById("profile-menu");
  if (profileMenu) {
    profileMenu.classList.toggle("no-display");
  } 
}

editProfile() {
  this.edit = true;
}
}
