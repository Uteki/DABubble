import { Component } from '@angular/core';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
username:string = "Frederik Beck";
useremail:string = " fred.back@email.com ";
edit: boolean = false;
private wasEmpty = true;

onInputChange(value: string) {
  if (this.wasEmpty && value.length > 0 && value === '@') {
    
    this.wasEmpty = false;
  }
  if (value.length === 0) {
    this.wasEmpty = true;
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
