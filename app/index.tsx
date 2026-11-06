
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

// ==========================================
// TYPES
// ==========================================

type MenuItem = {
  id: string;
  dishName: string;
  description: string;
  course: string;
  price: string;
};

type Screen = 'home' | 'add' | 'stats';

const STORAGE_KEY = 'restaurant_menu_items';
const COURSES = ['Starter', 'Main Course', 'Dessert'];

// ==========================================
// MAIN APPLICATION
// ==========================================

export default function HomeScreen() {
  const [screen, setScreen] = useState<Screen>('home');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // FORM STATES
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dishName, setDishName] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  // SEARCH AND FILTER STATES
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('All');

  // ==========================================
  // LOAD SAVED MENU ITEMS
  // ==========================================

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const savedItems = await AsyncStorage.getItem(STORAGE_KEY);

        if (savedItems !== null) {
          setMenuItems(JSON.parse(savedItems));
        }
      } catch (e) {
        if (Platform.OS === 'web') {
          window.alert('Could not load saved menu items.');
        } else {
          Alert.alert('Error', 'Could not load saved menu items.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
  }, []);

  // ==========================================
  // AUTOMATICALLY SAVE MENU ITEMS
  // ==========================================

  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(menuItems)
      ).catch(() => {
        if (Platform.OS === 'web') {
          window.alert('Could not save menu items.');
        } else {
          Alert.alert('Storage Error', 'Could not save menu items.');
        }
      });
    }
  }, [menuItems, loading]);

  // ==========================================
  // CLEAR FORM
  // ==========================================

  const clearForm = () => {
    setDishName('');
    setDescription('');
    setCourse('');
    setPrice('');
    setError('');
    setEditingId(null);
  };

  // ==========================================
  // ADD OR UPDATE MENU ITEM
  // ==========================================

  const saveMenuItem = () => {
    if (!dishName.trim()) {
      setError('Please enter the dish name.');
      return;
    }

    if (!description.trim()) {
      setError('Please enter the description.');
      return;
    }

    if (!course) {
      setError('Please select a course.');
      return;
    }

    if (!price.trim()) {
      setError('Please enter the price.');
      return;
    }

    const priceNumber = Number(price);

    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      setError('Please enter a valid price greater than R0.');
      return;
    }

    if (!COURSES.includes(course)) {
      setError('Please select a valid course.');
      return;
    }

    if (editingId) {
      setMenuItems(previous =>
        previous.map(item =>
          item.id === editingId
            ? {
                ...item,
                dishName: dishName.trim(),
                description: description.trim(),
                course,
                price: priceNumber.toFixed(2),
              }
            : item
        )
      );

      if (Platform.OS === 'web') {
        window.alert('Menu item updated successfully.');
      } else {
        Alert.alert('Success', 'Menu item updated successfully.');
      }
    } else {
      const newMenuItem: MenuItem = {
        id: Date.now().toString(),
        dishName: dishName.trim(),
        description: description.trim(),
        course,
        price: priceNumber.toFixed(2),
      };

      setMenuItems(previous => [...previous, newMenuItem]);

      if (Platform.OS === 'web') {
        window.alert(`${dishName.trim()} has been added to your menu.`);
      } else {
        Alert.alert(
          'Success',
          `${dishName.trim()} has been added to your menu.`
        );
      }
    }

    clearForm();
    setScreen('home');
  };

  // ==========================================
  // EDIT MENU ITEM
  // ==========================================

  const handleEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setDishName(item.dishName);
    setDescription(item.description);
    setCourse(item.course);
    setPrice(item.price);
    setError('');
    setScreen('add');
  };

  // ==========================================
  // DELETE MENU ITEM
  // ==========================================

  const deleteMenuItem = async (id: string, name: string) => {
    try {
      const updatedItems = menuItems.filter(
        item => item.id !== id
      );

      // Save updated menu to storage
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedItems)
      );

      // Update the displayed menu
      setMenuItems(updatedItems);

      // Clear editing form if the deleted item was being edited
      if (editingId === id) {
        clearForm();
        setScreen('home');
      }

      if (Platform.OS === 'web') {
        window.alert(`${name} has been removed from your menu.`);
      } else {
        Alert.alert(
          'Deleted Successfully',
          `${name} has been removed from your menu.`
        );
      }
    } catch (e) {
      if (Platform.OS === 'web') {
        window.alert('Could not delete this menu item. Please try again.');
      } else {
        Alert.alert(
          'Delete Error',
          'Could not delete this menu item. Please try again.'
        );
      }
    }
  };

  const handleDelete = (id: string, name: string) => {
    // WEB BROWSER CONFIRMATION
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${name}"?`
      );

      if (confirmed) {
        deleteMenuItem(id, name);
      }

      return;
    }

    // ANDROID / IOS CONFIRMATION
    Alert.alert(
      'Delete Menu Item',
      `Are you sure you want to delete ${name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMenuItem(id, name),
        },
      ]
    );
  };

  // ==========================================
  // SEARCH AND FILTER LOGIC
  // ==========================================

  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.dishName
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());

    const matchesCourse =
      selectedCourseFilter === 'All' ||
      item.course === selectedCourseFilter;

    return matchesSearch && matchesCourse;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCourseFilter('All');
  };

  // ==========================================
  // STATISTICS CALCULATIONS
  // ==========================================

  const totalItems = menuItems.length;

  const averagePrice =
    totalItems > 0
      ? (
          menuItems.reduce(
            (sum, item) => sum + Number(item.price),
            0
          ) / totalItems
        ).toFixed(2)
      : '0.00';

  const courseCounts = COURSES.map(courseName => ({
    name: courseName,
    count: menuItems.filter(
      item => item.course === courseName
    ).length,
  }));

  // ==========================================
  // RENDER MENU ITEM
  // ==========================================

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.menuCard}>

      <View style={styles.menuTop}>
        <Text style={styles.dishName}>{item.dishName}</Text>

        <View style={styles.courseBadge}>
          <Text style={styles.courseText}>{item.course}</Text>
        </View>
      </View>

      <Text style={styles.description}>
        {item.description}
      </Text>

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Price</Text>
        <Text style={styles.price}>R {item.price}</Text>
      </View>

      <View style={styles.cardActions}>

        <Pressable
          style={styles.editButton}
          onPress={() => handleEdit(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </Pressable>

        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, item.dishName)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </Pressable>

      </View>
    </View>
  );

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E76F51" />
        <Text style={styles.loadingText}>
          Loading Restaurant Menu...
        </Text>
      </View>
    );
  }

  // ==========================================
  // HOME SCREEN
  // ==========================================

  if (screen === 'home') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={styles.header}>

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Restaurant</Text>
            <Text style={styles.titleAccent}>Menu Manager</Text>
            <Text style={styles.subtitle}>
              Manage your restaurant menu with ease
            </Text>
          </View>

          <Pressable
            style={styles.statsNavButton}
            onPress={() => setScreen('stats')}
          >
            <Text style={styles.statsNavButtonText}>
              📊 Stats
            </Text>
          </Pressable>

        </View>

        <View style={styles.content}>

          <Pressable
            style={styles.addButton}
            onPress={() => {
              clearForm();
              setScreen('add');
            }}
          >
            <Text style={styles.addButtonText}>
              + Add Menu Item
            </Text>
          </Pressable>

          <TextInput
            style={styles.searchInput}
            placeholder="Search dish by name..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.courseFilterPicker}>
            <Picker
              selectedValue={selectedCourseFilter}
              onValueChange={setSelectedCourseFilter}
              style={styles.picker}
            >
              <Picker.Item label="All Courses" value="All" />
              <Picker.Item label="Starter" value="Starter" />
              <Picker.Item label="Main Course" value="Main Course" />
              <Picker.Item label="Dessert" value="Dessert" />
            </Picker>
          </View>

          <Pressable
            style={styles.clearFilterButton}
            onPress={clearFilters}
          >
            <Text style={styles.clearFilterText}>
              Clear Search & Filters
            </Text>
          </Pressable>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Menu Items</Text>

            <Text style={styles.itemCount}>
              {filteredMenuItems.length}{' '}
              {filteredMenuItems.length === 1 ? 'item' : 'items'}
            </Text>
          </View>

          {filteredMenuItems.length === 0 ? (

            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🍽️</Text>

              <Text style={styles.emptyTitle}>
                No Menu Items Found
              </Text>

              <Text style={styles.emptyMessage}>
                {menuItems.length === 0
                  ? 'Add your first menu item to start building your restaurant menu.'
                  : 'No items match your current search or filter.'}
              </Text>
            </View>

          ) : (

            <FlatList
              data={filteredMenuItems}
              keyExtractor={item => item.id}
              renderItem={renderMenuItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
            />

          )}

        </View>
      </View>
    );
  }

  // ==========================================
  // STATISTICS SCREEN
  // ==========================================

  if (screen === 'stats') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={styles.addHeader}>

          <Pressable
            style={styles.backButton}
            onPress={() => setScreen('home')}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.addTitle}>Menu Statistics</Text>
            <Text style={styles.addSubtitle}>
              Overview of your restaurant data
            </Text>
          </View>

        </View>

        <ScrollView contentContainerStyle={styles.statsContent}>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Menu Items</Text>
            <Text style={styles.statValue}>{totalItems}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Average Price</Text>
            <Text style={styles.statValue}>R {averagePrice}</Text>
          </View>

          <Text style={styles.subSectionTitle}>
            Items per Course
          </Text>

          {courseCounts.map(item => (
            <View key={item.name} style={styles.statRow}>
              <Text style={styles.statRowLabel}>{item.name}</Text>
              <Text style={styles.statRowValue}>{item.count}</Text>
            </View>
          ))}

          <Pressable
            style={[styles.cancelButton, { marginTop: 20 }]}
            onPress={() => setScreen('home')}
          >
            <Text style={styles.cancelButtonText}>
              Back to Menu
            </Text>
          </Pressable>

        </ScrollView>
      </View>
    );
  }

  // ==========================================
  // ADD / EDIT MENU ITEM SCREEN
  // ==========================================

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.addHeader}>

        <Pressable
          style={styles.backButton}
          onPress={() => {
            clearForm();
            setScreen('home');
          }}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View>
          <Text style={styles.addTitle}>
            {editingId ? 'Edit Menu Item' : 'Add Menu Item'}
          </Text>

          <Text style={styles.addSubtitle}>
            Enter the details below
          </Text>
        </View>

      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.form}
      >

        {error !== '' && (
          <View style={styles.errorBox}>
            <View style={styles.errorCircle}>
              <Text style={styles.errorCircleText}>!</Text>
            </View>

            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dish Name</Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Chicken Alfredo"
            placeholderTextColor="#999999"
            value={dishName}
            onChangeText={text => {
              setDishName(text);
              setError('');
            }}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>

          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="Describe the dish..."
            placeholderTextColor="#999999"
            value={description}
            onChangeText={text => {
              setDescription(text);
              setError('');
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Course</Text>

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={course}
              onValueChange={value => {
                setCourse(value);
                setError('');
              }}
              style={styles.picker}
            >
              <Picker.Item label="Select a course" value="" />
              <Picker.Item label="Starter" value="Starter" />
              <Picker.Item label="Main Course" value="Main Course" />
              <Picker.Item label="Dessert" value="Dessert" />
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Price</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.currency}>R</Text>

            <TextInput
              style={styles.priceInput}
              placeholder="85.00"
              placeholderTextColor="#999999"
              value={price}
              onChangeText={text => {
                setPrice(text);
                setError('');
              }}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Pressable
          style={styles.saveButton}
          onPress={saveMenuItem}
        >
          <Text style={styles.saveButtonText}>
            {editingId ? 'UPDATE MENU ITEM' : 'SAVE MENU ITEM'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.cancelButton}
          onPress={() => {
            clearForm();
            setScreen('home');
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}

// ==========================================
// APPLICATION STYLES
// ==========================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F6F7F8',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F6F7F8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#17212B',
  },

  header: {
    backgroundColor: '#17212B',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerTextContainer: {
    flex: 1,
    marginRight: 8,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },

  titleAccent: {
    color: '#F4A261',
    fontSize: 26,
    fontWeight: '800',
  },

  subtitle: {
    color: '#D5D9DC',
    fontSize: 13,
    marginTop: 4,
  },

  statsNavButton: {
    backgroundColor: '#263442',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },

  statsNavButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
  },

  addButton: {
    backgroundColor: '#E76F51',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 4,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#17212B',
    marginBottom: 8,
  },

  courseFilterPicker: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 5,
  },

  picker: {
    color: '#17212B',
  },

  clearFilterButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 5,
    marginBottom: 8,
  },

  clearFilterText: {
    color: '#2A9D8F',
    fontSize: 13,
    fontWeight: '700',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  sectionTitle: {
    color: '#17212B',
    fontSize: 19,
    fontWeight: '800',
  },

  itemCount: {
    color: '#777777',
    fontSize: 14,
  },

  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 35,
    alignItems: 'center',
    marginTop: 10,
  },

  emptyIcon: {
    fontSize: 50,
    marginBottom: 12,
  },

  emptyTitle: {
    color: '#17212B',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },

  emptyMessage: {
    color: '#777777',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },

  list: {
    paddingBottom: 30,
  },

  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
  },

  menuTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  dishName: {
    flex: 1,
    color: '#17212B',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 10,
  },

  courseBadge: {
    backgroundColor: '#FFF0EA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  courseText: {
    color: '#D95D39',
    fontSize: 12,
    fontWeight: '700',
  },

  description: {
    color: '#666666',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    marginTop: 12,
    paddingTop: 10,
  },

  priceLabel: {
    color: '#777777',
    fontSize: 13,
  },

  price: {
    color: '#E76F51',
    fontSize: 17,
    fontWeight: '800',
  },

  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },

  editButton: {
    backgroundColor: '#2A9D8F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },

  deleteButton: {
    backgroundColor: '#E76F51',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  addHeader: {
    backgroundColor: '#17212B',
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#263442',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  backText: {
    color: '#FFFFFF',
    fontSize: 35,
    lineHeight: 38,
    marginTop: -4,
  },

  addTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },

  addSubtitle: {
    color: '#BFC6CC',
    fontSize: 13,
    marginTop: 3,
  },

  form: {
    padding: 20,
    paddingBottom: 50,
  },

  inputGroup: {
    marginBottom: 18,
  },

  label: {
    color: '#17212B',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: '#17212B',
  },

  descriptionInput: {
    minHeight: 100,
  },

  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    overflow: 'hidden',
  },

  priceContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  currency: {
    color: '#17212B',
    fontSize: 16,
    fontWeight: '700',
    paddingLeft: 15,
  },

  priceInput: {
    flex: 1,
    color: '#17212B',
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },

  errorBox: {
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F3B5B5',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  errorCircle: {
    backgroundColor: '#D64545',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  errorCircleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  errorText: {
    flex: 1,
    color: '#B52B2B',
    fontSize: 13,
    fontWeight: '600',
  },

  saveButton: {
    backgroundColor: '#2A9D8F',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 5,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },

  cancelButtonText: {
    color: '#666666',
    fontSize: 15,
    fontWeight: '600',
  },

  statsContent: {
    padding: 20,
  },

  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 2,
  },

  statLabel: {
    color: '#777777',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },

  statValue: {
    color: '#17212B',
    fontSize: 28,
    fontWeight: '800',
  },

  subSectionTitle: {
    color: '#17212B',
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 10,
  },

  statRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  statRowLabel: {
    color: '#333333',
    fontSize: 15,
    fontWeight: '600',
  },

  statRowValue: {
    color: '#E76F51',
    fontSize: 16,
    fontWeight: '800',
  },

});
