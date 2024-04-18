import { Component, OnInit, NgZone } from '@angular/core';
import { BLE } from '@awesome-cordova-plugins/ble/ngx';
import { NavController, Platform } from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page implements OnInit {
  devices: any[] = [];

  private isDeviceConnected = false;
  private currentMessage = '';

  private device_id: string;
  private serviceUUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  private READ_CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
  private NOTIFY_CHARACTERISTIC_UUID = 'bc6fefd7-2a30-8a53-f76b-9937bc1ec4c1';

  constructor(private ble: BLE, private ngZone: NgZone, private platform: Platform) {
    console.log('constructor()');
  }

  ngOnInit(): void {
    this.start();
  }

  start() {
    this.platform.ready().then(() => {
      console.log('platform.ready()');
      this.ble.enable().then(() => {
        console.log('ble.enable()');
        this.ble.isEnabled().then(() => {
          console.log('ble.isEnabled()');
          this.ble.startScan([]).subscribe(
            (device) => this.onDeviceDiscovered(device),
            (error) => {
              console.log('connect() error: ', JSON.stringify(error));
            }
          );
        });
      });
    });
  }

  bytesToString(buffer) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
  }

  onDeviceDiscovered(device) {
    console.log('device.name: ', JSON.stringify(device.name));
    if (!device.name) {
      return;
    }
    if (device.name.startsWith('zhghx')) {
      console.log('device.name.startsWith(zhghx)');
      this.ngZone.run(() => {
        console.log('ngZone.run()');
        this.device_id = device.id;
        this.ble.refreshDeviceCache(device.id, 1000);
        this.ble.connect(device.id).subscribe(
          (peripheral) => {
            console.log('ble.connect() peripheral: ', JSON.stringify(peripheral));
            this.ble.isConnected(device.id).then(() => {
              this.isDeviceConnected = true;
              console.log('ble.isConnected()');

              this.ngZone.run(() => {
                this.devices = [
                  {
                    id: 'title',
                    name: '[*] 蓝牙连接成功 ... '
                  }
                ];
              });

              // 主动读取
              // this.readBLE();
              this.ble
                .startNotification(
                  this.device_id,
                  this.serviceUUID,
                  this.NOTIFY_CHARACTERISTIC_UUID
                )
                .subscribe(
                  (status) => {
                    // 收到设备的推送消息
                    status = this.bytesToString(status.buffer);
                    console.log('startNotification() status: ', status);
                    // TODO 实际上可以直接读取Notification的内容，但是未知原因的，接受不到Notification的消息，只能收到事件，获取不到消息
                    // 读取READ特征内容
                    this.readBLE();
                  },
                  (error) => {
                    console.log('startNotification() error: ', JSON.stringify(error));
                  }
                );
              console.log('ble.stopScan()');
              this.ble.stopScan();
              console.log('Done');
            });
          },
          (peripheralData) => {
            this.ngZone.run(() => {
              this.devices = [
                {
                  id: 'title',
                  name: '[*] 蓝牙已经断开连接!'
                }
              ];
            });
            this.isDeviceConnected = false;
            console.error('Disconnected from device', peripheralData);
            this.start();
            console.log('ble Restarting Scan ...');
          }
        );
      });
    }
  }

  readBLE() {
    if (this.isDeviceConnected) {
      this.ble.read(this.device_id, this.serviceUUID, this.READ_CHARACTERISTIC_UUID).then(
        (status) => {
          status = this.bytesToString(status);
          if (this.currentMessage !== status) {
            this.currentMessage = status;
            console.log('read() status: ', JSON.stringify(status));
            this.ngZone.run(() => {
              this.devices.push({
                id: 'title',
                name: status
              });
            });
          }
        },
        (error) => {
          console.log('read() error: ', JSON.stringify(error));
        }
      );
    }
  }
}
