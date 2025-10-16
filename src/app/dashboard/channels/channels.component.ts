import { Component, OnInit } from '@angular/core';
import { UserService } from './../../user.service';
import { NgForOf, NgClass } from '@angular/common';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [NgForOf, NgClass],
  templateUrl: './channels.component.html',
  styleUrl: './channels.component.scss',
})
export class ChannelsComponent implements OnInit {
  users: any[] = [];
  directMessagesShown: boolean = true;
  directMessagesNone: boolean = false;

  constructor(private UserService: UserService) {}

  ngOnInit(): void {
    this.UserService.getUser().subscribe((data) => {
      this.users = data;
    });
    setTimeout(() => {
      console.log(this.users);
    }, 2000);
  }

  toggleDirectMessages() {
    this.directMessagesShown = !this.directMessagesShown;
    this.directMessagesNone = false;
    if (this.directMessagesShown == false) {
      setTimeout(() => {
        this.directMessagesNone = true;
      }, 300);
    }
  }
}
