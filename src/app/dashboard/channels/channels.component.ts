import { Component, OnInit } from '@angular/core';
import { UserService } from './../../user.service';
import { NgForOf } from '@angular/common';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [NgForOf],
  templateUrl: './channels.component.html',
  styleUrl: './channels.component.scss',
})
export class ChannelsComponent implements OnInit {
  users: any[] = [];

  constructor(private UserService: UserService) {}

  ngOnInit(): void {
    this.UserService.getUser().subscribe((data) => {
      this.users = data;
    });
    setTimeout(() => {
      console.log(this.users);
    }, 2000);
  }
}
