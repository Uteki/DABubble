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
  changeNameValidation(editedUsername: string, sessionData: string | null, selectedAvatar: string, originalAvatar: string, username: string, edit: boolean, toggleProfileMenu: boolean) {
    const nameError = this.validationName(editedUsername);
    if (nameError !== null || editedUsername.trim() === '') {
      return { username, edit, toggleProfileMenu, originalAvatar, nameError };
    }
    
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
    return { username, edit, toggleProfileMenu, originalAvatar, nameError };
  }

  /**
   * Validates the name input in real-time.
   * Checks if the trimmed name is empty or contains less than 2 words.
   * @returns The validation error message or null if valid
   */
  validationName(editedUsername: string): string | null {
    const trimmedName = editedUsername.trim();
    const words = trimmedName.split(/\s+/).filter(word => word.length > 0);
    
    if (trimmedName === '') {
      return 'Der Name darf nicht leer sein.';
    } else if (words.length < 2) {
      return 'Der Name muss mindestens zwei Wörter enthalten.';
    } else {
      return null;
    }
  }
}
