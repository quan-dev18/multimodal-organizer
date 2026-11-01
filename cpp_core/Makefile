CXX = g++
CXXFLAGS = -O3 -Wall -Wextra -std=c++20 -fPIC
LDFLAGS = -shared -lcrypto

TARGET = libmmo_core.so
SRCS = mmo_core.cpp

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CXX) $(CXXFLAGS) $(SRCS) -o $(TARGET) $(LDFLAGS)

clean:
	rm -f $(TARGET)
