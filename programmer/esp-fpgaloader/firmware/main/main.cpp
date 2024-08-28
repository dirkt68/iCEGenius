#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "driver/spi_master.h"
#include "driver/gpio.h"
#include "rom/spi_flash.h"
#include "esp_flash_spi_init.h"
#include "esp_log.h"

// pin config
constexpr gpio_num_t SPI_MOSI_PIN = GPIO_NUM_5;
constexpr gpio_num_t SPI_MISO_PIN = GPIO_NUM_3;
constexpr gpio_num_t SPI_SCK_PIN  = GPIO_NUM_4;
constexpr gpio_num_t CS_PIN       = GPIO_NUM_18;
constexpr gpio_num_t CRESET_B_PIN = GPIO_NUM_19;

constexpr uint16_t BASE_ADDR = 0x0000;

static const char *TAG = "iCEGenius";

// state machine enum
typedef enum {
    IDLE,
    RXING,
    ERASE_FLASH,
    WRITE_FLASH,
} State_t;

static State_t curr_state = State_t::IDLE;

extern "C" void app_main() {
    ESP_LOGI(TAG, "Starting iCEGenius programmer");
    // 1. init spi bus, gpios, and usb serial
    // gpio for creset_b
    gpio_config_t creset_b_config = { .pin_bit_mask = (1ULL << CRESET_B_PIN),
                                      .mode         = GPIO_MODE_OUTPUT_OD,
                                      .pull_up_en   = GPIO_PULLUP_DISABLE,
                                      .pull_down_en = GPIO_PULLDOWN_DISABLE,
                                      .intr_type    = GPIO_INTR_DISABLE };

    ESP_ERROR_CHECK(gpio_config(&creset_b_config));
    gpio_set_level(CRESET_B_PIN, 1); // let float, pulled up externally

    // spi for eeprom
    spi_bus_config_t spi_config = { .mosi_io_num     = SPI_MOSI_PIN,
                                    .miso_io_num     = SPI_MISO_PIN,
                                    .sclk_io_num     = SPI_SCK_PIN,
                                    .quadwp_io_num   = -1,
                                    .quadhd_io_num   = -1,
                                    .max_transfer_sz = 256 };

    ESP_ERROR_CHECK(spi_bus_initialize(SPI2_HOST, &spi_config, SPI_DMA_CH_AUTO));

    // setup flash
    static esp_flash_t *flash;
    static esp_flash_spi_device_config_t flash_spi_config = { .host_id        = SPI2_HOST,
                                                              .cs_io_num      = CS_PIN,
                                                              .io_mode        = SPI_FLASH_SLOWRD,
                                                              .input_delay_ns = 0,
                                                              .freq_mhz       = 5 };
    ESP_ERROR_CHECK(spi_bus_add_flash_device(&flash, &flash_spi_config));
    ESP_ERROR_CHECK(esp_flash_init(flash));
    while (true) {
        switch (curr_state) {
            case State_t::IDLE: {
                // 2. wait for rx from serial while plugged in
                break;
            }

            case State_t::RXING: {
                break;
            }

            case State_t::ERASE_FLASH: {
                break;
            }

            case State_t::WRITE_FLASH: {
                curr_state = State_t::IDLE;
                break;
            }

            default: break;
        }
    }


    // 3. rxing, save data to memory or stream (not decided yet), connect to flash
    // 4. after done or while streaming, pull creset_b low to force fpga into reset
    // 5. write data to flash over spi
    // 6. after write, disconnect from flash and release creset_b
    // 7. sleep(if possbile) or wait until next rx from serial
}