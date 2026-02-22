import { Injectable } from '@angular/core';
import { UserService } from '../../../../dashboard/user.service';

@Injectable({
  providedIn: 'root',
})
export class HeaderValidationService {
  constructor(private userService: UserService) {}


    /**
   * Updates the user name and avatar in the database.
   * Validates that the name contains at least 2 words before updating.
   * Updates avatar if a new one was selected.
   * Disables edit mode afterwards.
   */
  changeNameValidation(nameError: string | null , editedUsername:string, sessionData: string | null, selectedAvatar: string , originalAvatar:string, username:string, edit:boolean, toggleProfileMenu: boolean ) {
    this.validationName(nameError, editedUsername);
    if (nameError !== null || editedUsername.trim() === '') return;
    const inputName = editedUsername.trim();
    if (sessionData) {
      this.userService.updateUserName(sessionData, inputName).catch((err) => console.error(err));
      if (selectedAvatar) {
        this.userService.updateUserAvatar(sessionData, selectedAvatar).catch((err) => console.error(err));
        originalAvatar = selectedAvatar;
      }
    }
    username = inputName;
    edit = false;
    toggleProfileMenu = !toggleProfileMenu;
    return {username, edit, toggleProfileMenu, originalAvatar};
  }

  /**
   * Validates the name input in real-time.
   * Checks if the trimmed name is empty or contains less than 2 words.
   */
  validationName(nameError:string | null , editedUsername:string ) {
   const trimmedName = editedUsername.trim();
    const words = trimmedName.split(/\s+/).filter(word => word.length > 0);
    if (trimmedName === '') {
      nameError = 'Der Name darf nicht leer sein.';
    } else if (words.length < 2) {
      nameError = 'Der Name muss mindestens zwei Wörter enthalten.';
    } else {
      nameError = null;
    }
  }
}
